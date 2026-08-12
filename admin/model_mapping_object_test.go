package admin

import (
	"strings"
	"testing"
)

// TestNormalizeAccountModelMappingAcceptsObjectValues 覆盖映射值的对象写法：
// 旧的字符串写法必须继续通过，对象写法必须能存下 display_name / fork /
// force_mapping，而缺 name、字段类型不对或 display_name 越界要被拒。
func TestNormalizeAccountModelMappingAcceptsObjectValues(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{
			name: "legacy_string_value",
			raw:  `{"claude-opus-5":"claude-opus-4-5"}`,
		},
		{
			name: "object_name_only",
			raw:  `{"claude-opus-5":{"name":"claude-opus-4-5"}}`,
		},
		{
			name: "object_all_fields",
			raw:  `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":"Opus 5 别名","fork":true,"force_mapping":true}}`,
		},
		{
			name: "object_unknown_key_ignored",
			raw:  `{"claude-opus-5":{"name":"claude-opus-4-5","future_flag":123}}`,
		},
		{
			name: "mixed_string_and_object",
			raw:  `{"claude-opus-5":{"name":"claude-opus-4-5"},"claude-sonnet-5":"claude-sonnet-4-5"}`,
		},
		{
			name:    "object_missing_name",
			raw:     `{"claude-opus-5":{"display_name":"Opus 5"}}`,
			wantErr: true,
		},
		{
			name:    "object_empty_name",
			raw:     `{"claude-opus-5":{"name":"   "}}`,
			wantErr: true,
		},
		{
			name:    "object_name_not_string",
			raw:     `{"claude-opus-5":{"name":123}}`,
			wantErr: true,
		},
		{
			name:    "object_name_invalid_chars",
			raw:     `{"claude-opus-5":{"name":"bad<script>"}}`,
			wantErr: true,
		},
		{
			name:    "display_name_too_long",
			raw:     `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":"` + strings.Repeat("a", 65) + `"}}`,
			wantErr: true,
		},
		{
			name:    "display_name_not_string",
			raw:     `{"claude-opus-5":{"name":"claude-opus-4-5","display_name":true}}`,
			wantErr: true,
		},
		{
			name:    "fork_not_bool",
			raw:     `{"claude-opus-5":{"name":"claude-opus-4-5","fork":"yes"}}`,
			wantErr: true,
		},
		{
			name:    "force_mapping_not_bool",
			raw:     `{"claude-opus-5":{"name":"claude-opus-4-5","force_mapping":1}}`,
			wantErr: true,
		},
		{
			name:    "alias_invalid_chars",
			raw:     `{"bad<alias>":{"name":"claude-opus-4-5"}}`,
			wantErr: true,
		},
		{
			name:    "value_number",
			raw:     `{"claude-opus-5":123}`,
			wantErr: true,
		},
		{
			name:    "value_array",
			raw:     `{"claude-opus-5":["claude-opus-4-5"]}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			normalized, err := normalizeAccountModelMapping(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("normalizeAccountModelMapping(%s) = %q, 期望报错", tt.raw, normalized)
				}
				return
			}
			if err != nil {
				t.Fatalf("normalizeAccountModelMapping(%s) 意外报错: %v", tt.raw, err)
			}
			if normalized != tt.raw {
				t.Fatalf("normalized = %q, want 原样返回 %q", normalized, tt.raw)
			}
		})
	}
}

// TestValidateModelMappingDisplayName 直接测展示名规则：控制字符要拦、空格与中文
// 要放行。控制字符不放进上面的 JSON 表，是因为原始控制字符本身就不是合法 JSON，
// 会在解码阶段被拦下，测不到这条规则。
func TestValidateModelMappingDisplayName(t *testing.T) {
	tests := []struct {
		name        string
		displayName string
		wantErr     bool
	}{
		{name: "empty", displayName: ""},
		{name: "plain", displayName: "Opus 5"},
		{name: "cjk_with_space", displayName: "Opus 5 别名"},
		{name: "max_length", displayName: strings.Repeat("a", 64)},
		{name: "too_long", displayName: strings.Repeat("a", 65), wantErr: true},
		{name: "bell", displayName: "Opus" + string(rune(7)) + "5", wantErr: true},
		{name: "newline", displayName: "Opus\n5", wantErr: true},
		{name: "tab", displayName: "Opus\t5", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateModelMappingDisplayName("claude-opus-5", tt.displayName)
			if tt.wantErr && err == nil {
				t.Fatalf("display_name %q 期望报错", tt.displayName)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("display_name %q 意外报错: %v", tt.displayName, err)
			}
		})
	}
}
