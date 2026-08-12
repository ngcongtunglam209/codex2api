package admin

import "context"

// PublicHomePageEnabled 报告公开主页 / 公开文档站（/ 与 /docs）是否开启，默认开。
// 与其他公开门户开关不同的一点：数据库尚未初始化（settings == nil）时返回 false，
// 让根路径在首次部署时仍旧跳回 /admin/ 完成初始化，而不是先展示一个空壳主页。
func (h *Handler) PublicHomePageEnabled(ctx context.Context) (bool, error) {
	if h == nil || h.db == nil {
		return false, nil
	}
	settings, err := h.db.GetSystemSettings(ctx)
	if err != nil {
		return false, err
	}
	if settings == nil {
		return false, nil
	}
	return settings.PublicHomePageEnabled, nil
}
