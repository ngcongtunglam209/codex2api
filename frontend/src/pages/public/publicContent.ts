// 公开主页 + 公开文档站的全部文案与文档结构。
// 与 pages/docs/docsContent.ts 的分工：那份是管理员视角（含 admin API、密钥管理），
// 这份只讲下游用户用得到的东西，且带越南语。
import type { PublicLocale } from './publicLocale'

export type Copy = Record<PublicLocale, string>

export function pick(copy: Copy, locale: PublicLocale): string {
  return copy[locale] || copy.en
}

// 代码块里的占位符在渲染时替换：
//   {BASE} → 站点根地址（https://api.example.com）
//   {API}  → 站点根地址 + /v1
export const PLACEHOLDER_KEY = 'sk-your-api-key'

export type DocsBlock =
  | { kind: 'p'; text: Copy }
  | { kind: 'list'; items: Copy[] }
  | { kind: 'note'; tone: 'info' | 'warn'; text: Copy }
  | { kind: 'code'; lang: string; label?: string; code: string }
  | { kind: 'table'; head: Copy[]; rows: Copy[][] }

export type DocsSection = {
  id: string
  title: Copy
  intro?: Copy
  blocks: DocsBlock[]
}

const c = (vi: string, en: string, zh: string): Copy => ({ vi, en, zh })

/* ─────────────────────────── Landing ─────────────────────────── */

export const nav = {
  docs: c('Tài liệu', 'Docs', '文档'),
  pricing: c('Bảng giá', 'Pricing', '价格'),
  usage: c('Tra cứu usage', 'Key usage', '用量查询'),
  admin: c('Quản trị', 'Admin', '管理台'),
  getStarted: c('Bắt đầu', 'Get started', '快速开始'),
}

export const landing = {
  eyebrow: c('Cổng API dùng chung', 'Shared API gateway', '共享 API 网关'),
  title: c(
    'Một endpoint, ba giao thức: OpenAI, Anthropic và Codex',
    'One endpoint, three protocols: OpenAI, Anthropic and Codex',
    '一个端点，三种协议：OpenAI、Anthropic 与 Codex',
  ),
  subtitle: c(
    'Trỏ client của bạn vào base URL bên dưới, dùng API key được cấp. Không cần đổi SDK, không cần proxy riêng — streaming, tool calling và Responses continuation đều đi qua nguyên vẹn.',
    'Point your client at the base URL below and use the API key you were given. No SDK swap, no personal proxy — streaming, tool calls and Responses continuations all pass through.',
    '把客户端指向下面的 base URL，使用分配给你的 API key 即可。无需更换 SDK、无需自建代理——流式、工具调用与 Responses 续接都原样透传。',
  ),
  baseUrlLabel: c('Base URL', 'Base URL', 'Base URL'),
  baseUrlHint: c(
    'Client nào tự thêm /v1 thì dùng địa chỉ gốc — gateway nhận cả hai dạng.',
    'Clients that append /v1 themselves can use the root address — the gateway accepts both shapes.',
    '客户端自己会拼 /v1 时填根地址即可，网关同时接受两种形态。',
  ),
  copy: c('Sao chép', 'Copy', '复制'),
  copied: c('Đã sao chép', 'Copied', '已复制'),
  keyNotice: c(
    'Chưa có API key? Liên hệ người vận hành site này — key được phát từ trang quản trị, trang này không tự phát key.',
    'No API key yet? Ask whoever runs this deployment — keys are issued from the admin panel, this page cannot mint them.',
    '还没有 API key？找本站运维索取——key 在管理台发放，本页不签发密钥。',
  ),
  featuresTitle: c('Có gì trong này', 'What you get', '能力一览'),
  features: [
    {
      title: c('Tương thích OpenAI', 'OpenAI-compatible', '兼容 OpenAI'),
      body: c(
        '/v1/chat/completions và /v1/responses nhận đúng payload OpenAI, kể cả SSE streaming và previous_response_id.',
        '/v1/chat/completions and /v1/responses take stock OpenAI payloads, including SSE streaming and previous_response_id.',
        '/v1/chat/completions 与 /v1/responses 直接吃原生 OpenAI 请求体，含 SSE 流式与 previous_response_id。',
      ),
    },
    {
      title: c('Tương thích Anthropic', 'Anthropic-compatible', '兼容 Anthropic'),
      body: c(
        '/v1/messages và /v1/messages/count_tokens hoạt động với Claude Code và mọi SDK Anthropic.',
        '/v1/messages and /v1/messages/count_tokens work with Claude Code and any Anthropic SDK.',
        '/v1/messages 与 /v1/messages/count_tokens 可直接对接 Claude Code 及任意 Anthropic SDK。',
      ),
    },
    {
      title: c('Codex CLI gốc', 'Native Codex CLI', '原生 Codex CLI'),
      body: c(
        'Nhóm /backend-api/codex/* giữ nguyên wire format của Codex CLI, gồm cả WebSocket và compact.',
        'The /backend-api/codex/* routes keep the Codex CLI wire format, WebSocket and compact included.',
        '/backend-api/codex/* 保留 Codex CLI 原始 wire 格式，含 WebSocket 与 compact。',
      ),
    },
    {
      title: c('Tạo ảnh', 'Image generation', '图像生成'),
      body: c(
        'Đồng bộ qua /v1/images/generations và /v1/images/edits; hoặc bất đồng bộ qua /v1/images/jobs cho prompt chạy lâu.',
        'Synchronous via /v1/images/generations and /v1/images/edits, or async via /v1/images/jobs for long prompts.',
        '同步走 /v1/images/generations、/v1/images/edits；长任务可用异步 /v1/images/jobs。',
      ),
    },
    {
      title: c('Pool tự chuyển account', 'Pool-level failover', '账号池自动容灾'),
      body: c(
        'Request được điều phối qua pool nhiều account với health tier, cooldown và retry — account bị rate limit tự bị bỏ qua.',
        'Requests are scheduled across a pool with health tiers, cooldowns and retries — rate-limited accounts get skipped automatically.',
        '请求在带健康分层、冷却与重试的账号池上调度——被限流的账号会自动跳过。',
      ),
    },
    {
      title: c('Usage minh bạch', 'Transparent usage', '用量透明'),
      body: c(
        'Mỗi key tự tra được số request, token và chi phí ở trang tra cứu usage, không cần quyền admin.',
        'Every key can look up its own requests, tokens and cost on the usage page — no admin access needed.',
        '每个 key 都能在用量查询页自查请求数、token 与花费，无需管理员权限。',
      ),
    },
  ],
  quickstartTitle: c('Ba dòng để chạy', 'Three lines to first token', '三行跑通'),
  quickstartHint: c(
    'Thay sk-your-api-key bằng key của bạn. SDK OpenAI/Anthropic chỉ cần đổi base URL.',
    'Swap sk-your-api-key for your own key. The OpenAI/Anthropic SDKs only need the base URL changed.',
    '把 sk-your-api-key 换成你自己的 key。OpenAI/Anthropic SDK 只需改 base URL。',
  ),
  docsCta: c('Đọc tài liệu đầy đủ', 'Read the full docs', '查看完整文档'),
  statusOnline: c('Gateway đang chạy', 'Gateway online', '网关在线'),
  statusOffline: c('Không đọc được trạng thái', 'Status unavailable', '状态不可用'),
  statusAccounts: c('account khả dụng', 'accounts available', '个账号可用'),
  footerNote: c(
    'Vận hành bằng Codex2API. Trang này không lưu API key của bạn — thứ gì bạn dán vào cũng chỉ nằm trong trình duyệt.',
    'Powered by Codex2API. This page stores no API key — anything you paste stays in your browser.',
    '由 Codex2API 驱动。本页不保存任何 API key——你粘贴的内容只留在浏览器里。',
  ),
}

export const landingSnippets: { id: string; label: string; lang: string; code: string }[] = [
  {
    id: 'curl',
    label: 'curl',
    lang: 'bash',
    code: `curl {API}/chat/completions \\
  -H "Authorization: Bearer ${PLACEHOLDER_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"xin chào"}]}'`,
  },
  {
    id: 'python',
    label: 'Python',
    lang: 'python',
    code: `from openai import OpenAI

client = OpenAI(base_url="{API}", api_key="${PLACEHOLDER_KEY}")

stream = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "xin chào"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
  },
  {
    id: 'node',
    label: 'Node.js',
    lang: 'javascript',
    code: `import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: '{API}',
  apiKey: '${PLACEHOLDER_KEY}',
})

const res = await client.chat.completions.create({
  model: 'gpt-5.5',
  messages: [{ role: 'user', content: 'xin chào' }],
})
console.log(res.choices[0].message.content)`,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    lang: 'bash',
    code: `curl {API}/messages \\
  -H "x-api-key: ${PLACEHOLDER_KEY}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-sonnet-4-5-20250514","max_tokens":1024,
       "messages":[{"role":"user","content":"xin chào"}]}'`,
  },
]

/* ─────────────────────────── Pricing ─────────────────────────── */

export const pricing = {
  title: c('Bảng giá', 'Pricing', '价格'),
  subtitle: c(
    'Tính theo token thực dùng, đơn vị trên 1 triệu token. Không phí thuê tháng, không tính request rỗng.',
    'Billed on tokens actually used, quoted per one million tokens. No monthly seat fee, no charge for empty requests.',
    '按实际用量计费，单位为每百万 token。无月租，不对空请求计费。',
  ),
  unit: c('/ 1M token', '/ 1M tokens', '/ 每百万 token'),
  model: c('Model', 'Model', '模型'),
  input: c('Input', 'Input', '输入'),
  cachedInput: c('Input đã cache', 'Cached input', '缓存输入'),
  output: c('Output', 'Output', '输出'),
  note: c('Ghi chú', 'Note', '备注'),
  vndHint: c(
    'Cột VND là quy đổi tham khảo theo tỷ giá {RATE} ₫/USD; thanh toán chốt theo USD.',
    'The VND column is a reference conversion at {RATE} ₫/USD; settlement is in USD.',
    'VND 列按 {RATE} ₫/USD 折算，仅供参考；结算以 USD 为准。',
  ),
  cachedHint: c(
    'Input đã cache áp dụng cho phần prompt lặp lại giữa các lượt — dùng Responses với previous_response_id hoặc prompt caching sẽ rơi vào mức này.',
    'Cached input applies to prompt prefixes reused across turns — Responses with previous_response_id or prompt caching land in this tier.',
    '缓存输入适用于多轮之间复用的 prompt 前缀——使用 Responses 的 previous_response_id 或 prompt 缓存会落在该档。',
  ),
  howToPay: c('Cách mua', 'How to buy', '如何购买'),
  empty: c(
    'Bảng giá chưa được công bố. Liên hệ người vận hành để nhận báo giá.',
    'The price list is not published yet. Contact the operator for a quote.',
    '价目表尚未公开，请联系运维获取报价。',
  ),
  loadError: c('Không tải được bảng giá.', 'Could not load the price list.', '价目表加载失败。'),
  ctaDocs: c('Xem tài liệu tích hợp', 'Read the integration docs', '查看接入文档'),
}

/* ──────────────────────────── Docs ───────────────────────────── */

export const docsMeta = {
  title: c('Tài liệu API', 'API documentation', 'API 文档'),
  subtitle: c(
    'Mọi thứ cần để gắn client vào gateway này: xác thực, endpoint, ví dụ, mã lỗi và cấu hình sẵn cho từng công cụ.',
    'Everything needed to wire a client to this gateway: auth, endpoints, examples, error codes and ready-made tool configs.',
    '把客户端接到本网关所需的一切：鉴权、端点、示例、错误码，以及各客户端的现成配置。',
  ),
  tocTitle: c('Nội dung', 'On this page', '本页内容'),
  backHome: c('Về trang chủ', 'Back home', '返回首页'),
}

export const docsSections: DocsSection[] = [
  {
    id: 'quickstart',
    title: c('Bắt đầu', 'Quickstart', '快速开始'),
    intro: c(
      'Ba bước: lấy key, đặt base URL, gửi request.',
      'Three steps: get a key, set the base URL, send a request.',
      '三步：拿 key、设置 base URL、发请求。',
    ),
    blocks: [
      {
        kind: 'list',
        items: [
          c(
            'Xin API key từ người vận hành site (dạng sk-...). Key được phát ở trang quản trị.',
            'Ask the operator of this deployment for an API key (looks like sk-...). Keys are issued in the admin panel.',
            '向本站运维索取 API key（形如 sk-...）。key 在管理台发放。',
          ),
          c(
            'Base URL: {API} — hoặc {BASE} nếu client của bạn tự thêm /v1.',
            'Base URL: {API} — or {BASE} if your client appends /v1 itself.',
            'Base URL：{API}——若客户端自己会拼 /v1，则填 {BASE}。',
          ),
          c(
            'Gửi request y như gửi cho OpenAI/Anthropic. Không cần header riêng của gateway.',
            'Send the request exactly as you would to OpenAI/Anthropic. No gateway-specific headers required.',
            '像请求 OpenAI/Anthropic 一样发即可，不需要网关专属请求头。',
          ),
        ],
      },
      {
        kind: 'code',
        lang: 'bash',
        label: 'curl',
        code: `curl {API}/chat/completions \\
  -H "Authorization: Bearer ${PLACEHOLDER_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "Xin chào"}],
    "stream": true
  }'`,
      },
      {
        kind: 'note',
        tone: 'info',
        text: c(
          'Không biết model nào đang bật? Gọi GET {API}/models bằng key của bạn — danh sách trả về chính là những model bạn được phép dùng.',
          'Not sure which models are enabled? Call GET {API}/models with your key — the returned list is exactly what you may use.',
          '不确定开了哪些模型？带上你的 key 调 GET {API}/models——返回列表就是你可用的模型。',
        ),
      },
    ],
  },
  {
    id: 'auth',
    title: c('Xác thực', 'Authentication', '鉴权'),
    blocks: [
      {
        kind: 'p',
        text: c(
          'Đường OpenAI/Codex dùng Bearer token. Đường Anthropic nhận cả x-api-key (đúng chuẩn Anthropic) và Authorization: Bearer.',
          'OpenAI/Codex paths use a Bearer token. Anthropic paths accept both x-api-key (the Anthropic convention) and Authorization: Bearer.',
          'OpenAI/Codex 路径用 Bearer token；Anthropic 路径同时接受 x-api-key（Anthropic 惯例）与 Authorization: Bearer。',
        ),
      },
      {
        kind: 'code',
        lang: 'http',
        code: `Authorization: Bearer ${PLACEHOLDER_KEY}
Content-Type: application/json`,
      },
      {
        kind: 'p',
        text: c(
          'Nếu nhiều người dùng chung một key, gửi thêm header dưới đây để mỗi người được ghim vào một account ổn định trong pool (tăng cache hit, giảm nhiễu ngữ cảnh). Giá trị gốc được băm SHA-256 tại gateway, không lưu và không chuyển lên upstream.',
          'When several end users share one key, send the header below so each of them sticks to a stable account in the pool (better cache hits, less context churn). The raw value is SHA-256 derived at the gateway; it is never stored or forwarded upstream.',
          '多个最终用户共享同一个 key 时，加上下面这个请求头可把每个人固定到池内某个账号（提高缓存命中、减少上下文抖动）。原始值在网关侧做 SHA-256 派生，不保存也不转发给上游。',
        ),
      },
      {
        kind: 'code',
        lang: 'http',
        code: 'X-Codex2API-Affinity-Key: tenant-user-or-conversation-id',
      },
      {
        kind: 'note',
        tone: 'warn',
        text: c(
          'Đừng nhúng key vào web hay app phía client — ai đọc được key cũng tiêu quota của bạn. Hãy gọi qua backend của bạn.',
          'Never ship the key inside a browser or mobile app — anyone who reads it spends your quota. Proxy through your own backend.',
          '不要把 key 打进前端或移动端——任何拿到它的人都在花你的额度。请经由你自己的后端转发。',
        ),
      },
    ],
  },
  {
    id: 'endpoints',
    title: c('Danh sách endpoint', 'Endpoint reference', '端点清单'),
    intro: c(
      'Mỗi endpoint có ba dạng đường dẫn: có tiền tố /v1, không tiền tố (cho client đã tự thêm /v1), và nhóm Codex-direct.',
      'Every endpoint exists in three path shapes: /v1-prefixed, prefixless (for clients that append /v1 themselves), and the Codex-direct group.',
      '每个端点有三种路径形态：带 /v1 前缀、无前缀（给自己会拼 /v1 的客户端）、以及 Codex 直连组。',
    ),
    blocks: [
      {
        kind: 'table',
        head: [c('Method + path', 'Method + path', 'Method + path'), c('Dùng để', 'Purpose', '用途')],
        rows: [
          [
            c('POST /v1/chat/completions', 'POST /v1/chat/completions', 'POST /v1/chat/completions'),
            c('Chat Completions kiểu OpenAI, có stream.', 'OpenAI-style Chat Completions, streaming supported.', 'OpenAI 形态 Chat Completions，支持流式。'),
          ],
          [
            c('POST /v1/responses', 'POST /v1/responses', 'POST /v1/responses'),
            c('Responses API, hỗ trợ previous_response_id.', 'Responses API, supports previous_response_id.', 'Responses API，支持 previous_response_id。'),
          ],
          [
            c('GET /v1/responses', 'GET /v1/responses', 'GET /v1/responses'),
            c('Kênh WebSocket của Responses (Codex CLI dùng).', 'WebSocket channel for Responses (used by Codex CLI).', 'Responses 的 WebSocket 通道（Codex CLI 用）。'),
          ],
          [
            c('POST /v1/responses/compact', 'POST /v1/responses/compact', 'POST /v1/responses/compact'),
            c('Nén hội thoại dài theo cơ chế compact của Codex.', 'Compact a long conversation the way Codex does.', '按 Codex 的 compact 机制压缩长会话。'),
          ],
          [
            c('POST /v1/responses/input_tokens', 'POST /v1/responses/input_tokens', 'POST /v1/responses/input_tokens'),
            c('Đếm token đầu vào trước khi gửi.', 'Count input tokens before sending.', '发送前统计输入 token。'),
          ],
          [
            c('POST /v1/messages', 'POST /v1/messages', 'POST /v1/messages'),
            c('Anthropic Messages (Claude Code, SDK Anthropic).', 'Anthropic Messages (Claude Code, Anthropic SDKs).', 'Anthropic Messages（Claude Code、Anthropic SDK）。'),
          ],
          [
            c('POST /v1/messages/count_tokens', 'POST /v1/messages/count_tokens', 'POST /v1/messages/count_tokens'),
            c('Đếm token theo chuẩn Anthropic.', 'Anthropic-style token counting.', 'Anthropic 形态 token 计数。'),
          ],
          [
            c('POST /v1/images/generations', 'POST /v1/images/generations', 'POST /v1/images/generations'),
            c('Tạo ảnh từ prompt (đồng bộ).', 'Text-to-image, synchronous.', '文生图（同步）。'),
          ],
          [
            c('POST /v1/images/edits', 'POST /v1/images/edits', 'POST /v1/images/edits'),
            c('Sửa ảnh có sẵn (đồng bộ).', 'Edit an existing image, synchronous.', '图生图 / 编辑（同步）。'),
          ],
          [
            c('POST /v1/images/jobs', 'POST /v1/images/jobs', 'POST /v1/images/jobs'),
            c('Tạo job ảnh bất đồng bộ, trả về id.', 'Create an async image job, returns an id.', '创建异步生图任务，返回 id。'),
          ],
          [
            c('GET /v1/images/jobs/:id', 'GET /v1/images/jobs/:id', 'GET /v1/images/jobs/:id'),
            c('Xem tiến độ / kết quả job ảnh.', 'Poll an async image job.', '查询异步生图任务。'),
          ],
          [
            c('GET /v1/models', 'GET /v1/models', 'GET /v1/models'),
            c('Model bạn được phép gọi.', 'Models you are allowed to call.', '你可调用的模型。'),
          ],
          [
            c('GET /health', 'GET /health', 'GET /health'),
            c('Health check, không cần key.', 'Health check, no key required.', '健康检查，无需 key。'),
          ],
        ],
      },
      {
        kind: 'p',
        text: c(
          'Codex CLI trỏ thẳng vào /backend-api/codex/responses (POST + WebSocket), /backend-api/codex/models và /backend-api/codex/alpha/search khi bật web search.',
          'Codex CLI talks to /backend-api/codex/responses (POST + WebSocket), /backend-api/codex/models and /backend-api/codex/alpha/search when web search is on.',
          'Codex CLI 直接访问 /backend-api/codex/responses（POST + WebSocket）、/backend-api/codex/models，开启联网搜索时还有 /backend-api/codex/alpha/search。',
        ),
      },
    ],
  },
  {
    id: 'chat',
    title: c('Chat Completions', 'Chat Completions', 'Chat Completions'),
    blocks: [
      {
        kind: 'p',
        text: c(
          'Payload giống hệt OpenAI. stream: true trả SSE, kết thúc bằng data: [DONE].',
          'The payload is stock OpenAI. stream: true returns SSE terminated by data: [DONE].',
          '请求体与 OpenAI 完全一致。stream: true 返回 SSE，以 data: [DONE] 结束。',
        ),
      },
      {
        kind: 'code',
        lang: 'python',
        label: 'openai-python',
        code: `from openai import OpenAI

client = OpenAI(base_url="{API}", api_key="${PLACEHOLDER_KEY}")

resp = client.chat.completions.create(
    model="gpt-5.5",
    messages=[
        {"role": "system", "content": "Bạn là trợ lý ngắn gọn."},
        {"role": "user", "content": "Giải thích HTTP/2 trong hai câu."},
    ],
    temperature=0.7,
)
print(resp.choices[0].message.content)`,
      },
      {
        kind: 'note',
        tone: 'info',
        text: c(
          'Tool calling đi qua nguyên vẹn: khai báo tools như với OpenAI rồi đọc tool_calls trong response.',
          'Tool/function calling passes through untouched: declare tools as you would with OpenAI and read tool_calls back.',
          '工具调用原样透传：像对 OpenAI 那样声明 tools，然后读取返回的 tool_calls。',
        ),
      },
    ],
  },
  {
    id: 'responses',
    title: c('Responses API', 'Responses API', 'Responses API'),
    blocks: [
      {
        kind: 'p',
        text: c(
          'Dùng khi cần reasoning item, compact, hoặc nối lượt bằng previous_response_id thay vì gửi lại toàn bộ hội thoại.',
          'Use it when you need reasoning items, compaction, or turn chaining via previous_response_id instead of resending the whole conversation.',
          '需要 reasoning item、compact，或用 previous_response_id 续接而不是重发整段会话时用它。',
        ),
      },
      {
        kind: 'code',
        lang: 'bash',
        code: `curl {API}/responses \\
  -H "Authorization: Bearer ${PLACEHOLDER_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "input": "Tóm tắt lịch sử TCP trong 3 câu",
    "stream": true
  }'`,
      },
      {
        kind: 'note',
        tone: 'warn',
        text: c(
          'Ngữ cảnh của previous_response_id được gateway tái tạo từ cache có giới hạn. Nếu chuỗi quá dài hoặc cache đã bị đẩy ra, bạn nhận HTTP 409 response_context_unavailable — khi đó gửi lại full context hoặc mở chuỗi mới; retry y nguyên sẽ lỗi lại.',
          'previous_response_id context is rebuilt from a bounded cache. If the chain outgrows it or the entry was evicted you get HTTP 409 response_context_unavailable — resend the full context or start a new chain. Retrying the same request verbatim will not help.',
          'previous_response_id 的上下文由有界缓存重建。链路超限或条目被淘汰时返回 HTTP 409 response_context_unavailable——此时请重发完整上下文或另起新链，原样重试没有意义。',
        ),
      },
    ],
  },
  {
    id: 'messages',
    title: c('Anthropic Messages', 'Anthropic Messages', 'Anthropic Messages'),
    blocks: [
      {
        kind: 'code',
        lang: 'bash',
        code: `curl {API}/messages \\
  -H "x-api-key: ${PLACEHOLDER_KEY}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-5-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Xin chào"}]
  }'`,
      },
      {
        kind: 'p',
        text: c(
          'Nếu pool có account Claude (Anthropic OAuth), request /v1/messages được chuyển thẳng lên Anthropic, không qua bước dịch giao thức. Model Anthropic được phục vụ bởi account Codex thì đi qua model mapping.',
          'When the pool holds Claude (Anthropic OAuth) accounts, /v1/messages is passed straight through to Anthropic with no protocol translation. Anthropic models served by Codex accounts go through model mapping instead.',
          '池内有 Claude（Anthropic OAuth）账号时，/v1/messages 原生透传到 Anthropic，不做协议翻译；由 Codex 账号承接的 Anthropic 模型则走模型映射。',
        ),
      },
      {
        kind: 'note',
        tone: 'info',
        text: c(
          'Claude Code chỉ cần hai biến môi trường — xem mục cấu hình client bên dưới.',
          'Claude Code needs just two environment variables — see the client configs below.',
          'Claude Code 只需两个环境变量，见下方客户端配置。',
        ),
      },
    ],
  },
  {
    id: 'images',
    title: c('Tạo ảnh', 'Images', '图像'),
    blocks: [
      {
        kind: 'code',
        lang: 'bash',
        code: `# đồng bộ / synchronous
curl {API}/images/generations \\
  -H "Authorization: Bearer ${PLACEHOLDER_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-image-1","prompt":"a lantern-lit alley in Hanoi, rain","size":"1024x1024"}'

# bất đồng bộ / async: tạo job rồi poll
JOB=$(curl -s {API}/images/jobs \\
  -H "Authorization: Bearer ${PLACEHOLDER_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-image-1","prompt":"a lantern-lit alley in Hanoi, rain"}' | jq -r .id)

curl {API}/images/jobs/$JOB -H "Authorization: Bearer ${PLACEHOLDER_KEY}"`,
      },
      {
        kind: 'p',
        text: c(
          'Prompt phức tạp hay ảnh lớn nên đi đường bất đồng bộ: job không bị timeout của HTTP client cắt giữa đường.',
          'Prefer the async route for heavy prompts or large sizes: a job is not cut short by your HTTP client timeout.',
          '复杂 prompt 或大尺寸建议走异步：任务不会被 HTTP 客户端超时打断。',
        ),
      },
    ],
  },
  {
    id: 'models',
    title: c('Model', 'Models', '模型'),
    blocks: [
      {
        kind: 'code',
        lang: 'bash',
        code: `curl {API}/models -H "Authorization: Bearer ${PLACEHOLDER_KEY}"`,
      },
      {
        kind: 'p',
        text: c(
          'Danh sách phụ thuộc account trong pool và phạm vi của key, nên đây là nguồn đúng duy nhất — đừng hardcode danh sách model trong app.',
          'The list depends on the accounts in the pool and your key scope, so it is the only source of truth — do not hardcode a model list in your app.',
          '列表取决于池内账号与你的 key 范围，因此这是唯一可信来源——不要在应用里写死模型列表。',
        ),
      },
    ],
  },
  {
    id: 'errors',
    title: c('Mã lỗi', 'Errors', '错误码'),
    intro: c(
      'Lỗi luôn trả về dạng { "error": { message, type, code } }.',
      'Errors always come back as { "error": { message, type, code } }.',
      '错误统一返回 { "error": { message, type, code } }。',
    ),
    blocks: [
      {
        kind: 'table',
        head: [c('HTTP', 'HTTP', 'HTTP'), c('code', 'code', 'code'), c('Nên làm gì', 'What to do', '如何处理')],
        rows: [
          [
            c('401', '401', '401'),
            c('missing_api_key / invalid_api_key', 'missing_api_key / invalid_api_key', 'missing_api_key / invalid_api_key'),
            c('Thiếu hoặc sai header Authorization; kiểm tra key còn hiệu lực.', 'Missing or wrong Authorization header. Check the key is still valid.', 'Authorization 缺失或错误，检查 key 是否仍有效。'),
          ],
          [
            c('400', '400', '400'),
            c('invalid_request_error', 'invalid_request_error', 'invalid_request_error'),
            c('Payload sai. Đọc message, không retry.', 'Malformed payload. Read the message; do not retry.', '请求体有问题，读 message，不要重试。'),
          ],
          [
            c('403', '403', '403'),
            c('insufficient_scope', 'insufficient_scope', 'insufficient_scope'),
            c('Key không được phép dùng model / endpoint này.', 'The key is not allowed to use this model or endpoint.', 'key 无权使用该模型或端点。'),
          ],
          [
            c('409', '409', '409'),
            c('response_context_unavailable', 'response_context_unavailable', 'response_context_unavailable'),
            c('Ngữ cảnh previous_response_id đã mất; gửi lại full context.', 'The previous_response_id context is gone. Resend the full context.', 'previous_response_id 上下文已丢失，请重发完整上下文。'),
          ],
          [
            c('429', '429', '429'),
            c('rate_limit_reached', 'rate_limit_reached', 'rate_limit_reached'),
            c('Vượt RPM hoặc quota của key; backoff theo hàm mũ.', 'Key RPM or quota exceeded. Back off exponentially.', '超出 key 的 RPM 或额度，指数退避。'),
          ],
          [
            c('503', '503', '503'),
            c('no_available_account / service_unavailable', 'no_available_account / service_unavailable', 'no_available_account / service_unavailable'),
            c('Pool hết account khả dụng, hoặc backend phụ trợ đang lỗi; retry sau vài giây.', 'The pool has no schedulable account, or a shared backend is down. Retry after a few seconds.', '池内暂无可调度账号，或依赖后端故障。几秒后重试。'),
          ],
          [
            c('502 / 598', '502 / 598', '502 / 598'),
            c('upstream_error', 'upstream_error', 'upstream_error'),
            c('Upstream lỗi hoặc stream bị ngắt giữa đường; retry là hợp lệ.', 'Upstream failed or the stream broke mid-flight. Retrying is fine.', '上游失败或流中断，可以重试。'),
          ],
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        text: c(
          'Chiến lược retry gợi ý: 429 và 503 backoff 1s → 2s → 4s (khoảng bốn lần); 400/401/403 không retry.',
          'Suggested retry policy: back off 1s → 2s → 4s on 429 and 503 (about four attempts); never retry 400/401/403.',
          '建议重试策略：429 与 503 按 1s → 2s → 4s 退避（约四次）；400/401/403 不重试。',
        ),
      },
    ],
  },
  {
    id: 'limits',
    title: c('Giới hạn & usage', 'Limits & usage', '限额与用量'),
    blocks: [
      {
        kind: 'list',
        items: [
          c(
            'Mỗi API key có thể bị giới hạn RPM, quota token/chi phí và phạm vi model — do người vận hành cấu hình.',
            'Each API key can carry an RPM cap, a token/cost quota and a model scope, all set by the operator.',
            '每个 API key 可能带 RPM 上限、token/费用额度与模型范围，由运维配置。',
          ),
          c(
            'Concurrency được điều tiết ở tầng pool: khi mọi account đang bận, request chờ ngắn hoặc nhận 503 thay vì treo vô hạn.',
            'Concurrency is shaped at the pool layer: when every account is busy a request waits briefly or gets a 503 instead of hanging forever.',
            '并发在池层整形：所有账号都忙时，请求会短暂等待或返回 503，而不会无限挂起。',
          ),
          c(
            'Tra usage của chính key bạn (request, token, chi phí, log gần đây) ở trang tra cứu — chỉ cần dán key, không cần quyền admin.',
            'Look up your own key usage (requests, tokens, cost, recent logs) on the usage page — paste the key, no admin rights needed.',
            '在用量查询页自查本 key 的用量（请求数、token、花费、近期日志）——粘贴 key 即可，无需管理员权限。',
          ),
        ],
      },
    ],
  },
  {
    id: 'clients',
    title: c('Cấu hình client', 'Client setup', '客户端配置'),
    intro: c(
      'Dán base URL và key của bạn vào các mẫu dưới đây.',
      'Drop your base URL and key into the templates below.',
      '把你的 base URL 与 key 填进下面的模板。',
    ),
    blocks: [
      {
        kind: 'code',
        lang: 'toml',
        label: '~/.codex/config.toml — Codex CLI',
        code: `model_provider = "codex2api"
model = "gpt-5.5"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.codex2api]
name = "codex2api"
base_url = "{API}"
wire_api = "responses"
requires_openai_auth = true`,
      },
      {
        kind: 'p',
        text: c(
          'Codex CLI đọc key từ biến môi trường: export OPENAI_API_KEY="sk-...".',
          'Codex CLI reads the key from the environment: export OPENAI_API_KEY="sk-...".',
          'Codex CLI 从环境变量读 key：export OPENAI_API_KEY="sk-..."。',
        ),
      },
      {
        kind: 'code',
        lang: 'bash',
        label: 'Claude Code',
        code: `export ANTHROPIC_BASE_URL="{BASE}"
export ANTHROPIC_AUTH_TOKEN="${PLACEHOLDER_KEY}"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`,
      },
      {
        kind: 'code',
        lang: 'text',
        label: 'Cherry Studio · LobeChat · Cline · Open WebUI',
        code: `API base URL : {API}
API key      : ${PLACEHOLDER_KEY}
Model        : gpt-5.5`,
      },
      {
        kind: 'note',
        tone: 'info',
        text: c(
          'Client bắt buộc base URL kết thúc bằng /v1 thì dùng {API}; client tự thêm /v1 thì dùng {BASE}. Sai chỗ này sẽ ra 404 ở /v1/v1/....',
          'Clients that require the base URL to end in /v1 take {API}; clients that append /v1 themselves take {BASE}. Getting it wrong yields 404s on /v1/v1/....',
          '要求 base URL 以 /v1 结尾的客户端填 {API}；自己会拼 /v1 的填 {BASE}。填错会出现 /v1/v1/... 的 404。',
        ),
      },
    ],
  },
  {
    id: 'faq',
    title: c('Câu hỏi thường gặp', 'FAQ', '常见问题'),
    blocks: [
      {
        kind: 'p',
        text: c(
          'Streaming có được hỗ trợ không? Có — SSE cho HTTP và WebSocket cho đường Codex. Nếu bạn đứng sau nginx/Cloudflare, tắt buffering để token về ngay.',
          'Is streaming supported? Yes — SSE over HTTP and WebSocket on the Codex path. Behind nginx/Cloudflare, disable buffering so tokens arrive immediately.',
          '支持流式吗？支持——HTTP 走 SSE，Codex 路径走 WebSocket。若前面有 nginx/Cloudflare，请关闭缓冲以便 token 即时到达。',
        ),
      },
      {
        kind: 'p',
        text: c(
          'Prompt của tôi có bị lưu không? Gateway ghi log usage (model, token, chi phí, mã lỗi). Nội dung prompt chỉ được giữ khi người vận hành bật các tính năng cần nó — hãy hỏi họ nếu bạn xử lý dữ liệu nhạy cảm.',
          'Are my prompts stored? The gateway logs usage (model, tokens, cost, status). Prompt bodies are only retained when the operator enables features that need them — ask them if you handle sensitive data.',
          '我的 prompt 会被保存吗？网关记录用量（模型、token、花费、状态）。仅当运维开启了需要正文的功能时才会留存 prompt 内容——处理敏感数据前请先问运维。',
        ),
      },
      {
        kind: 'p',
        text: c(
          'Gặp 503 liên tục? Nghĩa là pool đang hết account khả dụng cho model đó (hết quota hoặc đang cooldown), không phải key của bạn sai. Đổi model hoặc báo người vận hành.',
          'Getting 503 repeatedly? The pool has no schedulable account for that model (quota drained or cooling down) — it is not your key. Switch model or tell the operator.',
          '一直 503？说明该模型在池内暂无可调度账号（额度耗尽或正在冷却），不是你的 key 有问题。换模型或联系运维。',
        ),
      },
    ],
  },
]
