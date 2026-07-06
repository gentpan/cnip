<template>
  <section class="cnp-view-page">
    <div class="cnp-view-card cnp-about">
      <div class="cnp-about-hero">
        <h2>关于</h2>
        <p class="cnp-about-tagline">简洁 · 快速 · 面向开发者的 IP 查询工具</p>
        <p class="cnp-about-intro">ip2region.io 是一个面向中文用户的 IP 查询工具，专注于提供快速、准确、稳定的 IP 归属地与网络信息解析服务。适用于开发调试、网络分析与日常查询场景。</p>
      </div>

      <div class="cnp-about-grid">
        <div class="cnp-about-card">
          <div class="cnp-about-card-icon cnp-about-icon-data">
            <svg viewBox="0 0 24 24" fill="none"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3>数据来源</h3>
          <p>基于 ip2region 高级离线数据库，支持 IPv4 / IPv6 双栈查询。</p>
          <ul>
            <li>国家 / 省份 / 城市</li>
            <li>运营商 (ISP) / ASN</li>
            <li>经纬度 / 时区</li>
            <li>17+ 核心字段覆盖</li>
          </ul>
        </div>

        <div class="cnp-about-card">
          <div class="cnp-about-card-icon cnp-about-icon-enhance">
            <svg viewBox="0 0 24 24" fill="none"><path d="M13.5 2L3 14h9l-1.5 8L21 10h-9l1.5-8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3>离线查询</h3>
          <p>只使用本地 ip2region 离线数据库，不依赖第三方实时增强接口。</p>
          <ul>
            <li>全程本地查询</li>
            <li>无外部增强请求</li>
            <li>支持 IPv4 / IPv6 双栈</li>
            <li>响应更稳定可控</li>
          </ul>
        </div>

        <div class="cnp-about-card">
          <div class="cnp-about-card-icon cnp-about-icon-update">
            <svg viewBox="0 0 24 24" fill="none"><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h3>自动更新</h3>
          <p>数据库定时自动同步，持续跟踪最新 IP 分配信息。</p>
          <ul>
            <li>定时调度，无需人工干预</li>
            <li>热更新，服务不中断</li>
            <li>确保查询结果时效性</li>
          </ul>
        </div>

        <div class="cnp-about-card">
          <div class="cnp-about-card-icon cnp-about-icon-privacy">
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
          <h3>隐私保护</h3>
          <p>我们重视用户隐私，承诺以下原则：</p>
          <ul>
            <li>不记录任何查询日志</li>
            <li>不进行用户行为追踪</li>
            <li>请求即时处理后丢弃</li>
          </ul>
        </div>
      </div>

      <div class="cnp-about-contact">
        <p>如有建议、合作或问题反馈，欢迎联系</p>
        <a href="mailto:info@ip2region.io" class="cnp-about-email" title="点击发送邮件">info#ip2region.io</a>
      </div>
    </div>
  </section>
</template>
