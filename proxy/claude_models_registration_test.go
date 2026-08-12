package proxy

import (
	"context"
	"testing"

	"github.com/codex2api/auth"
	"github.com/codex2api/database"
)

// 回归：Grok 账号未声明 models 时会补默认集，Claude 账号却没有对应分支，
// 于是默认可服务模型既不进 /v1/models 也过不了模型校验——看得到却调度不到。
func TestSupportedModelIDsIncludesDefaultClaude(t *testing.T) {
	store := auth.NewStore(nil, nil, &database.SystemSettings{MaxConcurrency: 2})
	store.AddAccount(&auth.Account{DBID: 1, RefreshToken: "rt-1", UpstreamType: auth.UpstreamClaude})
	h := NewHandler(store, nil, nil, nil)

	ids := h.supportedModelIDs(context.Background())
	for _, want := range DefaultClaudeModelIDs() {
		if !containsFold(ids, want) {
			t.Fatalf("%s 应出现在 /v1/models，实际: %v", want, ids)
		}
	}
}

// 显式声明 models 的 Claude 账号以白名单为准，不补默认集。
func TestSupportedModelIDsRespectsDeclaredClaudeModels(t *testing.T) {
	store := auth.NewStore(nil, nil, &database.SystemSettings{MaxConcurrency: 2})
	store.AddAccount(&auth.Account{DBID: 1, RefreshToken: "rt-1", UpstreamType: auth.UpstreamClaude, Models: []string{"claude-opus-5"}})
	h := NewHandler(store, nil, nil, nil)

	ids := h.supportedModelIDs(context.Background())
	if !containsFold(ids, "claude-opus-5") {
		t.Fatalf("声明的 claude-opus-5 应在列表，实际: %v", ids)
	}
	if containsFold(ids, "claude-haiku-4-5") {
		t.Fatalf("已声明白名单不应再补默认集(claude-haiku-4-5)，实际: %v", ids)
	}
}

// 默认集必须覆盖当前世代模型名，否则客户端默认模型直接被判 unsupported_model。
func TestDefaultClaudeModelIDsCoversCurrentGeneration(t *testing.T) {
	ids := DefaultClaudeModelIDs()
	for _, want := range []string{"claude-opus-5", "claude-sonnet-5", "claude-fable-5"} {
		if !containsFold(ids, want) {
			t.Fatalf("默认 Claude 模型集缺少 %s，实际: %v", want, ids)
		}
	}
}
