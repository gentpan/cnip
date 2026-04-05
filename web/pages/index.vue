<script setup lang="ts">
import faviconUrl from '~/assets/favicon.ico?url'

const { siteKey, profile } = useSiteProfile()
const query = ref('')
const { pending, error, data, lookup } = useLookup()

const submit = async () => {
  if (!query.value.trim()) return
  await lookup(query.value)
}

useHead(() => ({
  title: profile.value.title,
  link: [
    { rel: 'icon', type: 'image/x-icon', href: faviconUrl }
  ],
  meta: [
    {
      name: 'description',
      content: profile.value.description
    }
  ]
}))
</script>

<template>
  <CnipStandalone v-if="siteKey === 'cnip'" />

  <main v-else class="page-shell">
    <section id="query" class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">{{ profile.heroEyebrow }}</p>
        <h1>{{ profile.heroTitle }}</h1>
        <p class="intro">{{ profile.heroIntro }}</p>
      </div>

      <form class="search-panel" @submit.prevent="submit">
        <label class="input-label" for="query">{{ profile.searchLabel }}</label>
        <div class="input-row">
          <input
            id="query"
            v-model="query"
            class="query-input"
            type="text"
            :placeholder="profile.searchPlaceholder"
            autocomplete="off"
            spellcheck="false"
          >
          <button class="query-button" type="submit" :disabled="pending">
            {{ pending ? '查询中...' : profile.submitText }}
          </button>
        </div>

        <div class="example-row">
          <button
            v-for="item in profile.examples"
            :key="item"
            type="button"
            class="example-chip"
            @click="query = item"
          >
            {{ item }}
          </button>
        </div>
      </form>
    </section>

    <section id="features" class="feature-grid" aria-label="features">
      <article v-for="item in profile.features" :key="item.title" class="feature-card">
        <h2>{{ item.title }}</h2>
        <p>{{ item.body }}</p>
      </article>
    </section>

    <section v-if="error" class="status-card error-card">
      <p>{{ error }}</p>
    </section>

    <section v-if="data" id="results" class="results-section">
      <header class="results-header">
        <div>
          <p class="eyebrow">查询结果</p>
          <h2>{{ data.query }}</h2>
        </div>
        <div class="query-type-pill">{{ data.queryType }}</div>
      </header>

      <div v-if="data.resolvedIps?.length && data.queryType === 'domain'" class="resolved-box">
        <div class="resolved-head">
          <strong>域名解析结果</strong>
          <span>{{ data.resolvedIps.length }} 条记录</span>
        </div>
        <div class="resolved-table">
          <div class="resolved-row resolved-row-head">
            <span>IP 地址</span>
            <span>类型</span>
          </div>
          <div v-for="ip in data.resolvedIps" :key="ip" class="resolved-row">
            <code>{{ ip }}</code>
            <span>{{ ip.includes(':') ? 'IPv6' : 'IPv4' }}</span>
          </div>
        </div>
      </div>

      <div class="result-list">
        <article v-for="item in data.results" :key="item.ip" class="result-card">
          <div class="result-title-row">
            <h3>{{ item.ip }}</h3>
            <span class="family-badge">{{ item.family }}</span>
          </div>

          <div class="result-table">
            <div class="result-row"><span class="result-label">洲</span><span class="result-value">{{ item.continent || '-' }}</span></div>
            <div class="result-row"><span class="result-label">国家</span><span class="result-value">{{ item.country || '-' }}</span></div>
            <div class="result-row"><span class="result-label">省份</span><span class="result-value">{{ item.province || '-' }}</span></div>
            <div class="result-row"><span class="result-label">城市</span><span class="result-value">{{ item.city || '-' }}</span></div>
            <div class="result-row"><span class="result-label">区县</span><span class="result-value">{{ item.district || '-' }}</span></div>
            <div class="result-row"><span class="result-label">运营商</span><span class="result-value">{{ item.isp || '-' }}</span></div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
