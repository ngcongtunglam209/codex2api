package proxy

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/codex2api/auth"
	"github.com/codex2api/database"
	"github.com/gin-gonic/gin"
)

type listedModel struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
}

func listModelsForMapping(t *testing.T, accountMapping string) []listedModel {
	t.Helper()
	gin.SetMode(gin.TestMode)

	store := auth.NewStore(nil, nil, &database.SystemSettings{MaxConcurrency: 2})
	store.AddAccount(&auth.Account{
		DBID:         1,
		AccessToken:  "at-1",
		UpstreamType: auth.UpstreamClaude,
		Models:       []string{"claude-opus-4-5"},
		ModelMapping: accountMapping,
	})
	h := NewHandler(store, nil, nil, nil)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	h.ListModels(c)

	var payload struct {
		Data []listedModel `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("解析 /v1/models 失败: %v; body=%s", err, recorder.Body.String())
	}
	return payload.Data
}

func findListedModel(models []listedModel, id string) (listedModel, bool) {
	for _, model := range models {
		if model.ID == id {
			return model, true
		}
	}
	return listedModel{}, false
}

// TestListModelsForkDefaultKeepsUpstreamVisible fork 缺省必须维持历史行为：
// 别名与上游真名同时出现在 /v1/models。字符串写法同理。
func TestListModelsForkDefaultKeepsUpstreamVisible(t *testing.T) {
	for name, mapping := range map[string]string{
		"string_value": `{"claude-opus-5":"claude-opus-4-5"}`,
		"object_value": `{"claude-opus-5":{"name":"claude-opus-4-5"}}`,
		"fork_true":    `{"claude-opus-5":{"name":"claude-opus-4-5","fork":true}}`,
	} {
		t.Run(name, func(t *testing.T) {
			models := listModelsForMapping(t, mapping)
			if _, ok := findListedModel(models, "claude-opus-5"); !ok {
				t.Fatalf("别名 claude-opus-5 应在列表: %+v", models)
			}
			if _, ok := findListedModel(models, "claude-opus-4-5"); !ok {
				t.Fatalf("上游真名 claude-opus-4-5 应在列表: %+v", models)
			}
		})
	}
}

// TestListModelsForkFalseHidesUpstream 显式 "fork": false 时只留别名。
func TestListModelsForkFalseHidesUpstream(t *testing.T) {
	models := listModelsForMapping(t, `{"claude-opus-5":{"name":"claude-opus-4-5","fork":false}}`)
	if _, ok := findListedModel(models, "claude-opus-5"); !ok {
		t.Fatalf("别名 claude-opus-5 应在列表: %+v", models)
	}
	if _, ok := findListedModel(models, "claude-opus-4-5"); ok {
		t.Fatalf("fork=false 时上游真名不应出现: %+v", models)
	}
}

// TestListModelsDisplayName display_name 只影响展示字段，未配置时字段不出现。
func TestListModelsDisplayName(t *testing.T) {
	models := listModelsForMapping(t, `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":"Opus 5"}}`)
	alias, ok := findListedModel(models, "claude-opus-5")
	if !ok {
		t.Fatalf("别名 claude-opus-5 应在列表: %+v", models)
	}
	if alias.DisplayName != "Opus 5" {
		t.Fatalf("display_name = %q, want %q", alias.DisplayName, "Opus 5")
	}
	upstream, ok := findListedModel(models, "claude-opus-4-5")
	if !ok {
		t.Fatalf("上游真名应仍在列表: %+v", models)
	}
	if upstream.DisplayName != "" {
		t.Fatalf("未配置 display_name 的模型不该带该字段, 实际 %q", upstream.DisplayName)
	}
}

// TestNewModelListingPresentation 覆盖隐藏规则的边界：通配规则不参与，
// 另有规则要求可见或该名字本身就是别的别名时一律保留。
func TestNewModelListingPresentation(t *testing.T) {
	tests := []struct {
		name        string
		mapping     string
		hidden      []string
		visible     []string
		displayName map[string]string
	}{
		{
			name:    "fork_false_hides_target",
			mapping: `{"claude-opus-5":{"name":"claude-opus-4-5","fork":false}}`,
			hidden:  []string{"claude-opus-4-5"},
			visible: []string{"claude-opus-5"},
		},
		{
			name:    "wildcard_rule_ignored",
			mapping: `{"claude-*":{"name":"claude-opus-4-5","fork":false}}`,
			visible: []string{"claude-opus-4-5"},
		},
		{
			name:    "other_rule_keeps_target_visible",
			mapping: `{"alias-a":{"name":"claude-opus-4-5","fork":false},"alias-b":{"name":"claude-opus-4-5"}}`,
			visible: []string{"claude-opus-4-5"},
		},
		{
			name:    "target_is_another_alias",
			mapping: `{"alias-a":{"name":"claude-opus-5","fork":false},"claude-opus-5":{"name":"claude-opus-4-5"}}`,
			visible: []string{"claude-opus-5"},
		},
		{
			name:        "display_name_recorded",
			mapping:     `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":"Opus 5"}}`,
			displayName: map[string]string{"claude-opus-5": "Opus 5", "claude-opus-4-5": ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			presentation := newModelListingPresentation(parseModelMappingRules(tt.mapping))
			for _, model := range tt.hidden {
				if !presentation.Hidden(model) {
					t.Fatalf("%s 应被隐藏", model)
				}
			}
			for _, model := range tt.visible {
				if presentation.Hidden(model) {
					t.Fatalf("%s 不应被隐藏", model)
				}
			}
			for model, want := range tt.displayName {
				if got := presentation.DisplayName(model); got != want {
					t.Fatalf("DisplayName(%s) = %q, want %q", model, got, want)
				}
			}
		})
	}
}
