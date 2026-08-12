package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/codex2api/auth"
	"github.com/gin-gonic/gin"
)

func claudeAccountWithMapping(mapping string) *auth.Account {
	return &auth.Account{
		UpstreamType: auth.UpstreamClaude,
		AccessToken:  "at",
		Models:       []string{"claude-opus-4-5"},
		ModelMapping: mapping,
	}
}

// TestForcedResponseModelForAccount 只有规则显式开 force_mapping 才回写别名：
// 字符串写法与未开该开关的对象写法都必须保持旧行为（响应里是上游真名）。
func TestForcedResponseModelForAccount(t *testing.T) {
	tests := []struct {
		name      string
		mapping   string
		requested string
		mapped    string
		want      string
	}{
		{
			name:      "legacy_string_rule_does_not_force",
			mapping:   `{"claude-opus-5":"claude-opus-4-5"}`,
			requested: "claude-opus-5",
			mapped:    "claude-opus-4-5",
			want:      "",
		},
		{
			name:      "object_without_flag_does_not_force",
			mapping:   `{"claude-opus-5":{"name":"claude-opus-4-5"}}`,
			requested: "claude-opus-5",
			mapped:    "claude-opus-4-5",
			want:      "",
		},
		{
			name:      "force_mapping_enabled",
			mapping:   `{"claude-opus-5":{"name":"claude-opus-4-5","force_mapping":true}}`,
			requested: "claude-opus-5",
			mapped:    "claude-opus-4-5",
			want:      "claude-opus-5",
		},
		{
			name:      "wildcard_rule_returns_requested_name",
			mapping:   `{"claude-*-5":{"name":"claude-opus-4-5","force_mapping":true}}`,
			requested: "claude-sonnet-5",
			mapped:    "claude-opus-4-5",
			want:      "claude-sonnet-5",
		},
		{
			name:      "same_model_after_mapping",
			mapping:   `{"claude-opus-4-5":{"name":"claude-opus-4-5","force_mapping":true}}`,
			requested: "claude-opus-4-5",
			mapped:    "claude-opus-4-5",
			want:      "",
		},
		{
			name:      "no_matching_rule",
			mapping:   `{"claude-opus-5":{"name":"claude-opus-4-5","force_mapping":true}}`,
			requested: "claude-haiku-4-5",
			mapped:    "claude-opus-4-5",
			want:      "",
		},
		{
			name:      "no_mapping_configured",
			mapping:   "",
			requested: "claude-opus-5",
			mapped:    "claude-opus-4-5",
			want:      "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := forcedResponseModelForAccount(claudeAccountWithMapping(tt.mapping), tt.requested, tt.mapped)
			if got != tt.want {
				t.Fatalf("forcedResponseModelForAccount = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestRewriteClaudeStreamModelLine 行尾必须原样保留，否则 SSE 分帧被破坏；
// 非法 JSON 或空的 forcedModel 一律原样返回。
func TestRewriteClaudeStreamModelLine(t *testing.T) {
	const event = `{"type":"message_start","message":{"model":"claude-opus-4-5"}}`

	tests := []struct {
		name   string
		line   string
		forced string
		want   string
	}{
		{
			name:   "lf_line_ending",
			line:   "data: " + event + "\n",
			forced: "claude-opus-5",
			want:   `data: {"type":"message_start","message":{"model":"claude-opus-5"}}` + "\n",
		},
		{
			name:   "crlf_line_ending",
			line:   "data: " + event + "\r\n",
			forced: "claude-opus-5",
			want:   `data: {"type":"message_start","message":{"model":"claude-opus-5"}}` + "\r\n",
		},
		{
			name:   "no_line_ending",
			line:   "data: " + event,
			forced: "claude-opus-5",
			want:   `data: {"type":"message_start","message":{"model":"claude-opus-5"}}`,
		},
		{
			name:   "empty_forced_model_passthrough",
			line:   "data: " + event + "\n",
			forced: "",
			want:   "data: " + event + "\n",
		},
		{
			name:   "invalid_json_passthrough",
			line:   "data: {broken\n",
			forced: "claude-opus-5",
			want:   "data: {broken\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := strings.TrimPrefix(strings.TrimRight(tt.line, "\r\n"), "data: ")
			got := string(rewriteClaudeStreamModelLine([]byte(tt.line), data, tt.forced))
			if got != tt.want {
				t.Fatalf("rewriteClaudeStreamModelLine = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestRelayClaudeResponseForcesModel 端到端覆盖透传链路：force_mapping 打开时
// 非流式根字段 model 与流式 message_start 的 message.model 都要回写成别名，
// 关闭时两者都保持上游真名。用量口径在两种情况下都必须一致。
func TestRelayClaudeResponseForcesModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	const jsonBody = `{"id":"msg_1","type":"message","model":"claude-opus-4-5","usage":{"input_tokens":10,"cache_read_input_tokens":4,"output_tokens":5}}`
	const streamBody = "event: message_start\n" +
		`data: {"type":"message_start","message":{"id":"msg_1","model":"claude-opus-4-5","usage":{"input_tokens":10,"cache_read_input_tokens":4,"output_tokens":1}}}` + "\n\n" +
		"event: content_block_delta\n" +
		`data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}` + "\n\n" +
		"event: message_delta\n" +
		`data: {"type":"message_delta","usage":{"output_tokens":5}}` + "\n\n"

	tests := []struct {
		name       string
		isStream   bool
		body       string
		forced     string
		wantModel  string
		wantAbsent string
	}{
		{name: "json_forced", body: jsonBody, forced: "claude-opus-5", wantModel: `"model":"claude-opus-5"`, wantAbsent: "claude-opus-4-5"},
		{name: "json_not_forced", body: jsonBody, wantModel: `"model":"claude-opus-4-5"`},
		{name: "stream_forced", isStream: true, body: streamBody, forced: "claude-opus-5", wantModel: `"model":"claude-opus-5"`, wantAbsent: "claude-opus-4-5"},
		{name: "stream_not_forced", isStream: true, body: streamBody, wantModel: `"model":"claude-opus-4-5"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader("{}"))

			handler := &Handler{}
			resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(tt.body))}
			usage, _, err := handler.relayClaudeResponse(c, resp, tt.isStream, time.Now(), nil, tt.forced)
			if err != nil {
				t.Fatalf("relayClaudeResponse 报错: %v", err)
			}

			out := recorder.Body.String()
			if !strings.Contains(out, tt.wantModel) {
				t.Fatalf("响应缺少 %s; body=%q", tt.wantModel, out)
			}
			if tt.wantAbsent != "" && strings.Contains(out, tt.wantAbsent) {
				t.Fatalf("响应仍含上游真名 %s; body=%q", tt.wantAbsent, out)
			}

			// 用量必须来自上游原始计数，改写模型名不能影响计费口径。
			if usage == nil {
				t.Fatalf("usage 为空")
			}
			if usage.PromptTokens != 14 || usage.CompletionTokens != 5 || usage.CachedTokens != 4 {
				t.Fatalf("usage = %+v, want prompt=14 completion=5 cached=4", usage)
			}
		})
	}
}
