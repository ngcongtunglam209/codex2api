package admin

import (
	"context"
	"testing"

	"github.com/codex2api/auth"
	"github.com/codex2api/cache"
	"github.com/codex2api/database"
)

// 公开主页开关必须在 SQLite 上完整往返，并且 handler 未就绪时不放行——
// 否则首次部署的根路径会展示一个还没配好账号的空壳主页。
func TestPublicHomePageEnabledRoundTrip(t *testing.T) {
	db := newTestAdminDB(t)
	tc := cache.NewMemory(1)
	defer tc.Close()
	store := auth.NewStore(db, tc, nil)
	handler := NewHandler(store, db, tc, nil, "admin-secret")

	ctx := context.Background()

	// 全新库里 system_settings 还没有行，此时必须拒绝放行。
	if enabled, err := handler.PublicHomePageEnabled(ctx); err != nil || enabled {
		t.Fatalf("未初始化时 PublicHomePageEnabled = %t, err = %v; want false, nil", enabled, err)
	}

	tests := []struct {
		name  string
		value bool
	}{
		{name: "enabled", value: true},
		{name: "disabled", value: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			settings, err := db.GetSystemSettings(ctx)
			if err != nil {
				t.Fatalf("GetSystemSettings: %v", err)
			}
			if settings == nil {
				settings = &database.SystemSettings{}
			}
			settings.PublicHomePageEnabled = tt.value
			if err := db.UpdateSystemSettings(ctx, settings); err != nil {
				t.Fatalf("UpdateSystemSettings: %v", err)
			}

			got, err := handler.PublicHomePageEnabled(ctx)
			if err != nil {
				t.Fatalf("PublicHomePageEnabled: %v", err)
			}
			if got != tt.value {
				t.Fatalf("PublicHomePageEnabled = %t, want %t", got, tt.value)
			}
		})
	}
}

func TestPublicHomePageEnabledWithoutDB(t *testing.T) {
	var handler *Handler
	got, err := handler.PublicHomePageEnabled(context.Background())
	if err != nil {
		t.Fatalf("PublicHomePageEnabled: %v", err)
	}
	if got {
		t.Fatal("handler 为 nil 时应返回 false，避免在未就绪状态下放行公开主页")
	}
}
