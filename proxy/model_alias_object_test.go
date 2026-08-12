package proxy

import "testing"

// 映射值的对象写法（name/display_name/fork/force_mapping）与旧的字符串写法必须共存：
// 对象写法此前被静默跳过，任何既有配置的解析结果都不能因为新增字段而改变。
func TestParseModelMappingRulesAcceptsObjectForm(t *testing.T) {
	tests := []struct {
		name             string
		mappingJSON      string
		lookup           string
		wantTo           string
		wantDisplayName  string
		wantFork         bool
		wantForceMapping bool
		wantMatch        bool
	}{
		{
			name:        "string form keeps old semantics",
			mappingJSON: `{"claude-opus-5":"claude-opus-4-5"}`,
			lookup:      "claude-opus-5",
			wantTo:      "claude-opus-4-5",
			wantMatch:   true,
		},
		{
			name:             "object form carries flags",
			mappingJSON:      `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":"Opus 5","fork":true,"force_mapping":true}}`,
			lookup:           "claude-opus-5",
			wantTo:           "claude-opus-4-5",
			wantDisplayName:  "Opus 5",
			wantFork:         true,
			wantForceMapping: true,
			wantMatch:        true,
		},
		{
			name:        "object form defaults flags to false",
			mappingJSON: `{"claude-opus-5":{"name":"claude-opus-4-5"}}`,
			lookup:      "claude-opus-5",
			wantTo:      "claude-opus-4-5",
			wantMatch:   true,
		},
		{
			name:        "object without name is dropped",
			mappingJSON: `{"claude-opus-5":{"display_name":"Opus 5"}}`,
			lookup:      "claude-opus-5",
			wantMatch:   false,
		},
		{
			name:        "mixed forms coexist",
			mappingJSON: `{"claude-opus-5":{"name":"claude-opus-4-5","fork":true},"claude-sonnet-5":"claude-sonnet-4-5"}`,
			lookup:      "claude-sonnet-5",
			wantTo:      "claude-sonnet-4-5",
			wantMatch:   true,
		},
		{
			name:        "wildcard still resolves in object form",
			mappingJSON: `{"claude-*-5":{"name":"claude-opus-4-5","force_mapping":true}}`,
			lookup:      "claude-fable-5",
			wantTo:      "claude-opus-4-5",
			wantMatch:   true,
			// 通配命中同样要带上标志位，否则 force_mapping 对通配规则形同虚设。
			wantForceMapping: true,
		},
		{
			name:        "unsupported value type is skipped",
			mappingJSON: `{"claude-opus-5":42}`,
			lookup:      "claude-opus-5",
			wantMatch:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rules := parseModelMappingRules(tt.mappingJSON)
			rule := matchModelMappingRule(tt.lookup, rules)
			if !tt.wantMatch {
				if rule != nil {
					t.Fatalf("matchModelMappingRule(%q) = %+v, want no match", tt.lookup, *rule)
				}
				return
			}
			if rule == nil {
				t.Fatalf("matchModelMappingRule(%q) = nil, want match", tt.lookup)
			}
			if rule.To != tt.wantTo {
				t.Fatalf("To = %q, want %q", rule.To, tt.wantTo)
			}
			if rule.DisplayName != tt.wantDisplayName {
				t.Fatalf("DisplayName = %q, want %q", rule.DisplayName, tt.wantDisplayName)
			}
			if rule.Fork != tt.wantFork {
				t.Fatalf("Fork = %t, want %t", rule.Fork, tt.wantFork)
			}
			if rule.ForceMapping != tt.wantForceMapping {
				t.Fatalf("ForceMapping = %t, want %t", rule.ForceMapping, tt.wantForceMapping)
			}
		})
	}
}
