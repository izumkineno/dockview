const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'manual');
fs.mkdirSync(outDir, { recursive: true });

const norm = (p) => p.replace(/\\/g, '/');
const read = (file) => {
    try {
        return fs.readFileSync(path.join(root, file), 'utf8');
    } catch {
        return '';
    }
};
const exists = (abs) => {
    try {
        return fs.statSync(abs).isFile();
    } catch {
        return false;
    }
};
const tracked = cp
    .execSync('git ls-files', { encoding: 'utf8', cwd: root })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(norm)
    .filter((p) => !p.startsWith('docs/manual/'));
const trackedSet = new Set(tracked);

const pkgJsons = tracked.filter(
    (p) => p === 'package.json' || /^packages\/[^/]+\/package\.json$/.test(p)
);
const pkgByDir = new Map([
    ['', { name: 'workspace-root', dir: '', json: JSON.parse(read('package.json') || '{}') }],
]);
for (const file of pkgJsons.filter((x) => x !== 'package.json')) {
    const json = JSON.parse(read(file) || '{}');
    const dir = norm(path.dirname(file));
    pkgByDir.set(dir, { name: json.name || dir, dir, json });
}
const getPkg = (file) => {
    const s = file.split('/');
    if (s[0] === 'packages' && s[1]) {
        return (
            pkgByDir.get(`packages/${s[1]}`) || {
                name: s[1],
                dir: `packages/${s[1]}`,
                json: {},
            }
        );
    }
    return pkgByDir.get('');
};

const wsEntry = {
    'dockview-core': 'packages/dockview-core/src/index.ts',
    dockview: 'packages/dockview/src/index.ts',
    'dockview-react': 'packages/dockview-react/src/index.ts',
    'dockview-vue': 'packages/dockview-vue/src/index.ts',
    'dockview-angular': 'packages/dockview-angular/src/public-api.ts',
    'dockview-docs': 'packages/docs/src/pages/index.tsx',
};
const wsNames = new Set(Object.keys(wsEntry));

const special = {
    'package.json': ['workspace 根脚本与 workspaces 定义', 'workspace-entry'],
    'nx.json': ['NX 编排与固定版本发布配置', 'workspace-orchestrator'],
    'tsconfig.base.json': ['全仓库 TypeScript 基线配置', 'ts-base'],
    'jest.config.ts': ['根级 Jest 聚合配置', 'test-entry'],
    'scripts/docs.mjs': ['TypeDoc 后处理与文档整理脚本', 'docs-build-script'],
    'packages/dockview-core/src/index.ts': ['dockview-core 公开导出入口', 'public-entry barrel'],
    'packages/dockview-core/src/api/entryPoints.ts': ['核心 API 入口类型汇总', 'api-entry'],
    'packages/dockview-core/src/dockview/dockviewComponent.ts': [
        'Dockview 主容器与布局状态协调核心',
        'core-runtime',
    ],
    'packages/dockview-core/src/dockview/dockviewGroupPanelModel.ts': [
        'Dockview 分组模型与 tab 状态管理核心',
        'group-model',
    ],
    'packages/dockview-core/src/dockview/deserializer.ts': [
        '布局快照反序列化恢复逻辑',
        'state-restore',
    ],
    'packages/dockview-core/src/overlay/overlayRenderContainer.ts': [
        '拖拽 overlay 渲染容器',
        'drag-overlay',
    ],
    'packages/dockview-core/src/popoutWindow.ts': [
        '弹出窗口与浮动组跨 window 协调',
        'popout-runtime',
    ],
    'packages/dockview/src/index.ts': ['React 包公开导出入口', 'public-entry barrel'],
    'packages/dockview/src/dockview/dockview.tsx': ['React Dockview 组件桥接层', 'react-runtime-bridge'],
    'packages/dockview-vue/src/index.ts': ['Vue 包公开导出入口', 'public-entry barrel'],
    'packages/dockview-vue/src/dockview/dockview.vue': ['Vue Dockview 组件桥接层', 'vue-runtime-bridge'],
    'packages/dockview-vue/src/composables/useViewComponent.ts': [
        'Vue 视图装配 composable',
        'vue-composable',
    ],
    'packages/dockview-react/src/index.ts': [
        '兼容包入口，整体 re-export 自 dockview',
        'compat-barrel',
    ],
    'packages/dockview-angular/src/public-api.ts': ['Angular 包公开导出入口', 'public-entry barrel'],
    'packages/dockview-angular/src/lib/dockview/dockview-angular.component.ts': [
        'Angular Dockview 组件桥接层',
        'angular-runtime-bridge',
    ],
    'packages/dockview-angular/src/lib/utils/angular-renderer.ts': [
        'Angular 动态渲染桥',
        'angular-renderer',
    ],
    'packages/docs/package.json': ['Docusaurus 文档站脚本与依赖配置', 'docs-package-config'],
    'packages/docs/docusaurus.config.js': ['Docusaurus 站点配置', 'docs-site-config'],
    'packages/docs/src/pages/index.tsx': ['文档站首页，对应 route `/`', 'docs-page'],
    'packages/docs/src/pages/demo.tsx': ['文档站 demo 页面，对应 route `/demo`', 'docs-page'],
    'packages/docs/scripts/buildTemplates.mjs': ['模板与 sandboxes 构建脚本', 'docs-template-builder'],
    'packages/docs/web-server/index.mjs': ['docs 开发辅助 ESM server', 'docs-dev-server'],
};

const kind = (f) => {
    const e = path.extname(f).toLowerCase();
    if (f === 'package.json' || f === 'nx.json') return 'workspace';
    if (/^\.github\/workflows\/.+\.ya?ml$/.test(f)) return 'ci';
    if (/\/__tests__\//.test(f) || /\.spec\.[tj]sx?$/.test(f)) return 'test';
    if (/^packages\/docs\/(sandboxes|templates)\//.test(f)) return 'example';
    if (/^scripts\//.test(f) || /\/scripts\//.test(f) || /gulpfile\.js$/.test(f)) return 'script';
    if (
        /rollup\.config\.js$|vite\.config\.ts$|docusaurus\.config\.js$|babel\.config\.js$|ng-package\.json$|^typedoc.*\.json$|^tsconfig.*\.json$|jest\.config\.ts$|^\.eslintrc\.js$|^\.prettierrc$|^\.editorconfig$|sidebars\.js$|sonar-project\.properties$/.test(
            f
        )
    ) {
        return 'config';
    }
    if (/^packages\/docs\/src\/generated\//.test(f)) return 'generated';
    if (/^packages\/docs\/src\/pages\/.+\.(tsx|md|mdx)$/.test(f)) return 'page';
    if (/\.vue$/.test(f)) return 'component';
    if (/src\/composables\//.test(f)) return 'composable';
    if (/src\/hooks?\//.test(f)) return 'hook';
    if (/service/i.test(f)) return 'service';
    if (/schema|validator|dto/i.test(f)) return 'schema';
    if (/types?\.ts$/.test(f)) return 'type';
    if (/\.(scss|css)$/.test(f)) return 'style';
    if (/\.(svg|png|jpg|jpeg|gif|ico)$/.test(f)) return 'asset';
    if (
        /\.(md|mdx|txt)$/.test(f) ||
        /^(README|LICENSE|SECURITY|AGENTS|CLAUDE)\.md$/.test(path.basename(f)) ||
        /^llms/.test(path.basename(f))
    ) {
        return 'doc';
    }
    if (/package\.json$/.test(f)) return 'config';
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) return 'source';
    if (e === '.json') return 'config';
    return 'generated';
};

const runtime = (f, k) => {
    if (k === 'ci') return 'ci';
    if (k === 'test') return 'test-time';
    if (k === 'config' || k === 'workspace') return 'build-time';
    if (k === 'script') return 'node';
    if (/web-server/.test(f)) return 'node';
    if (['page', 'component', 'hook', 'composable', 'example'].includes(k) || /^packages\/dockview/.test(f)) {
        return 'browser';
    }
    if (['doc', 'style', 'asset', 'generated'].includes(k)) return 'static';
    return 'node';
};

const role = (f, k) => {
    if (special[f]) return special[f][1];
    if (f.endsWith('/src/index.ts') || f.endsWith('/src/public-api.ts')) return 'public-entry barrel';
    if (/^packages\/docs\/src\/pages\//.test(f)) return 'route-page';
    if (k === 'test') return 'test-spec';
    if (k === 'style') return 'style-sheet';
    if (k === 'asset') return 'static-asset';
    if (k === 'doc') return 'documentation';
    if (k === 'config') return 'config-file';
    return 'module';
};

const summary = (f, k) => {
    if (special[f]) return special[f][0];
    if (k === 'ci') return `GitHub Actions 工作流：${path.basename(f)}`;
    if (k === 'test') return `测试用例：${path.basename(f)}`;
    if (k === 'page') return `页面文件：${path.basename(f)}`;
    if (k === 'component') return `组件文件：${path.basename(f)}`;
    if (k === 'example') return `示例或模板文件：${path.basename(f)}`;
    if (k === 'doc') {
        if (/^packages\/docs\/blog\//.test(f)) return `发布日志或博客：${path.basename(f)}`;
        if (/^packages\/docs\/docs\//.test(f)) return `文档页面：${f.replace(/^packages\/docs\/docs\//, '')}`;
        return `说明文档：${path.basename(f)}`;
    }
    if (k === 'config') return `配置文件：${path.basename(f)}`;
    if (k === 'script') return `脚本文件：${f}`;
    if (k === 'type') return `类型定义文件：${path.basename(f)}`;
    if (k === 'style') return `样式资源：${path.basename(f)}`;
    if (k === 'asset') return `静态资源：${path.basename(f)}`;
    if (k === 'generated') return `生成文件：${path.basename(f)}`;
    return `源码模块：${path.basename(f)}`;
};

const queries = (f, k) => {
    if (special[f]) return ['入口在哪里', '这个文件干什么', '相关实现在哪'];
    if (k === 'config') return ['配置项在哪', '构建为什么失败'];
    if (k === 'test') return ['这个功能有哪些测试', '回归先看哪条 spec'];
    if (k === 'page') return ['页面入口在哪', '页面依赖哪些组件'];
    if (k === 'example') return ['有没有示例可参考', '这个能力的最小案例在哪'];
    return ['这个文件是干什么的', '和哪些文件相关'];
};

const risk = (f, k) => {
    if (/src\/(index|public-api)\.ts$/.test(f)) return 'barrel 变更会扩大公开 API 影响面';
    if (k === 'config') return '配置漂移会影响构建或发布';
    if (k === 'script') return '脚本失败会阻断自动化流程';
    if (k === 'example') return '示例代码可能与主 API 漂移';
    return '';
};

const parseImports = (c) => {
    const s = new Set();
    const rs = [
        /\bimport\s+(?:type\s+)?[\s\S]*?\sfrom\s*['"]([^'"]+)['"]/g,
        /\bexport\s+(?:type\s+)?\{[\s\S]*?\}\sfrom\s*['"]([^'"]+)['"]/g,
        /\bexport\s+\*\s+from\s*['"]([^'"]+)['"]/g,
        /\bimport\s*['"]([^'"]+)['"]/g,
        /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const r of rs) {
        let m;
        while ((m = r.exec(c))) s.add(m[1]);
    }
    return [...s];
};

const envs = (c) => {
    const s = new Set();
    const rs = [
        /process\.env\.([A-Z0-9_]+)/g,
        /import\.meta\.env\.([A-Z0-9_]+)/g,
        /Deno\.env\.get\(['"]([A-Z0-9_]+)['"]\)/g,
    ];
    for (const r of rs) {
        let m;
        while ((m = r.exec(c))) s.add(m[1]);
    }
    if (/NODE_ENV/.test(c)) s.add('NODE_ENV');
    return [...s];
};

const defs = (c) => {
    const out = [];
    let m;
    const r = /(?:^|\n)\s*(export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(class|function|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
    while ((m = r.exec(c))) out.push({ exported: !!m[1], kind: m[2], name: m[3] });
    const d = /export\s+default\s+(?:class|function)?\s*([A-Za-z_$][\w$]*)?/g;
    while ((m = d.exec(c))) out.push({ exported: true, kind: 'default', name: m[1] || 'default' });
    return out;
};

const exp = (c) => {
    const direct = [];
    const named = [];
    const star = [];
    let m;
    const dr = /export\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(class|function|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
    while ((m = dr.exec(c))) direct.push({ name: m[2], kind: m[1] });
    const de = /export\s+default\s+(?:class|function)?\s*([A-Za-z_$][\w$]*)?/g;
    while ((m = de.exec(c))) direct.push({ name: m[1] || 'default', kind: 'default' });
    const br = /export\s*\{([^}]+)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
    while ((m = br.exec(c))) {
        for (const raw of m[1].split(',')) {
            const p = raw.trim();
            if (!p) continue;
            const bits = p.split(/\s+as\s+/i).map((x) => x.trim());
            if (m[2]) {
                named.push({ name: bits[1] || bits[0], imported: bits[0], spec: m[2] });
            } else {
                direct.push({ name: bits[1] || bits[0], kind: 'alias' });
            }
        }
    }
    const sr = /export\s+\*\s+from\s*['"]([^'"]+)['"]/g;
    while ((m = sr.exec(c))) star.push(m[1]);
    return { direct, named, star };
};

const resolve = (from, spec) => {
    const tryBase = (b) => {
        const cands = [
            b,
            ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.vue', '.md', '.mdx', '.scss', '.css', '.html'].map((e) => b + e),
            ...['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs', 'index.cjs', 'index.json', 'index.vue', 'index.md', 'index.mdx'].map((n) => path.join(b, n)),
        ];
        for (const cand of cands) {
            if (exists(cand)) return norm(path.relative(root, cand));
        }
        return null;
    };
    if (spec.startsWith('.')) return tryBase(path.resolve(root, path.dirname(from), spec));
    if (spec.startsWith('@site/')) return tryBase(path.join(root, 'packages/docs', spec.slice(6)));
    if (spec.startsWith('~site/')) return tryBase(path.join(root, 'packages/docs', spec.slice(6)));
    for (const name of wsNames) {
        if (spec === name) return wsEntry[name];
        if (spec.startsWith(`${name}/`)) {
            const base = wsEntry[name]
                ? path.join(root, path.dirname(wsEntry[name]).replace(/src$/, ''), 'src', spec.slice(name.length + 1))
                : null;
            if (base) {
                const r = tryBase(base);
                if (r) return r;
            }
        }
    }
    return null;
};

const data = new Map();
for (const f of tracked) {
    const c = read(f);
    const k = kind(f);
    const p = getPkg(f);
    data.set(f, {
        f,
        c,
        k,
        p,
        rt: runtime(f, k),
        role: role(f, k),
        summary: summary(f, k),
        queries: queries(f, k),
        risk: risk(f, k),
        modulePath: p.dir ? f.slice(p.dir.length + 1) : f,
        imps: c ? parseImports(c) : [],
        defs: c ? defs(c) : [],
        ex: c ? exp(c) : { direct: [], named: [], star: [] },
        env: c ? envs(c) : [],
    });
}

for (const [, r] of data) {
    r.rimps = r.imps.map((s) => ({ s, r: resolve(r.f, s) })).filter((x) => x.r);
    r.alias = r.imps.filter((s) => /^@/.test(s) || s.startsWith('~site/'));
}

const importedBy = new Map(tracked.map((f) => [f, []]));
for (const [, r] of data) {
    for (const i of r.rimps) {
        if (importedBy.has(i.r)) importedBy.get(i.r).push(r.f);
    }
}

const direct = new Map();
const named = new Map();
const star = new Map();
const defKinds = new Map();
for (const [f, r] of data) {
    direct.set(f, r.ex.direct);
    named.set(
        f,
        r.ex.named.map((x) => ({ ...x, r: resolve(f, x.spec) })).filter((x) => x.r)
    );
    star.set(
        f,
        r.ex.star.map((s) => ({ s, r: resolve(f, s) })).filter((x) => x.r)
    );
    for (const d of r.defs) defKinds.set(`${f}::${d.name}`, d.kind);
}

const flatCache = new Map();
const flat = (f, seen = new Set()) => {
    if (flatCache.has(f)) return flatCache.get(f);
    if (seen.has(f)) return [];
    seen.add(f);
    const n = new Set((direct.get(f) || []).map((x) => x.name));
    for (const x of named.get(f) || []) n.add(x.name);
    for (const x of star.get(f) || []) for (const s of flat(x.r, new Set(seen))) n.add(s);
    const out = [...n].sort();
    flatCache.set(f, out);
    return out;
};

const defFile = (f, sym, seen = new Set()) => {
    if (defKinds.has(`${f}::${sym}`)) return f;
    if (seen.has(f)) return null;
    seen.add(f);
    for (const x of named.get(f) || []) {
        if (x.name === sym) return defFile(x.r, x.imported, new Set(seen)) || x.r;
    }
    for (const x of star.get(f) || []) {
        if (flat(x.r).includes(sym)) return defFile(x.r, sym, new Set(seen)) || x.r;
    }
    return null;
};

const tokens = (f, extra = []) =>
    [
        ...new Set(
            `${f} ${extra.join(' ')}`
                .split(/[^a-zA-Z0-9]+/)
                .filter(Boolean)
                .map((x) => x.toLowerCase())
        ),
    ].slice(0, 24);

const fileRecords = tracked.map((f) => {
    const r = data.get(f);
    const exs = ['asset', 'style', 'doc'].includes(r.k) ? [] : flat(f);
    return {
        record_type: 'file_record',
        file_path: f,
        file_kind: r.k,
        package_name: r.p.name,
        module_path: r.modulePath,
        runtime_context: r.rt,
        role: r.role,
        one_line_summary: r.summary,
        exported_symbols: exs,
        imported_from_files: [...new Set(r.rimps.map((x) => x.r))].sort(),
        imported_by_files: [...new Set(importedBy.get(f) || [])].sort(),
        path_aliases_used: [...new Set(r.alias)].sort(),
        route_or_entry_relevance:
            f === 'package.json'
                ? 'workspace build/test/release entry'
                : /src\/(index|public-api)\.ts$/.test(f)
                  ? 'public package entry'
                  : /packages\/docs\/src\/pages\/index\.tsx$/.test(f)
                    ? 'route /'
                    : /packages\/docs\/src\/pages\/demo\.tsx$/.test(f)
                      ? 'route /demo'
                      : /packages\/docs\/src\/pages\/markdown-page\.md$/.test(f)
                        ? 'route /markdown-page'
                        : /^\.github\/workflows\//.test(f)
                          ? 'CI workflow entry'
                          : '',
        env_dependencies: r.env,
        feature_flags_or_modes: [
            ...new Set(
                [
                    /tsconfig\.esm\.json$/.test(f) ? 'esm' : '',
                    /rollup/.test(f) ? 'bundle' : '',
                    /jest|spec|__tests__/.test(f) ? 'test' : '',
                    /docs|docusaurus/.test(f) ? 'docs' : '',
                    /release|publish/.test(f) ? 'release' : '',
                    /templates|sandboxes/.test(f) ? 'example' : '',
                ].filter(Boolean)
            ),
        ],
        framework_tags: [
            ...new Set(
                [
                    /angular/.test(f) ? 'angular' : '',
                    /vue/.test(f) ? 'vue' : '',
                    /react|tsx/.test(f) || /^packages\/dockview\//.test(f) ? 'react' : '',
                    /^packages\/dockview-core\//.test(f) ? 'typescript' : '',
                    /^packages\/docs\//.test(f) ? 'docusaurus' : '',
                    /vite/.test(f) ? 'vite' : '',
                    /rollup/.test(f) ? 'rollup' : '',
                    /jest/.test(f) ? 'jest' : '',
                    /nx/.test(f) ? 'nx' : '',
                ].filter(Boolean)
            ),
        ],
        typical_queries: r.queries,
        search_keywords: tokens(f, [r.role, ...exs]),
        risk_notes: r.risk,
    };
});

const byPath = new Map(fileRecords.map((r) => [r.file_path, r]));
const symbolRecords = [];
const seenSym = new Set();
const addSym = (s) => {
    const k = `${s.symbol_name}::${s.defined_in}::${s.exported_from}::${s.visibility}`;
    if (seenSym.has(k)) return;
    seenSym.add(k);
    symbolRecords.push(s);
};

const importantInternal = {
    'packages/dockview-core/src/dockview/dockviewComponent.ts': ['DockviewComponent'],
    'packages/dockview-core/src/dockview/dockviewGroupPanelModel.ts': ['DockviewGroupPanelModel'],
    'packages/dockview/src/dockview/dockview.tsx': ['DockviewReact'],
    'packages/dockview-vue/src/composables/useViewComponent.ts': ['useViewComponent'],
    'packages/dockview-angular/src/lib/dockview/dockview-angular.component.ts': ['DockviewAngularComponent'],
};

for (const [f, r] of data) {
    const exported = new Set(flat(f));
    for (const d of r.defs) {
        const vis = exported.has(d.name) || d.exported ? 'public' : 'internal';
        if (vis === 'internal' && !((importantInternal[f] || []).includes(d.name))) continue;
        addSym({
            record_type: 'symbol_record',
            symbol_name: d.name,
            symbol_kind: d.kind,
            defined_in: f,
            exported_from: vis === 'public' ? f : '',
            module_path: r.modulePath,
            visibility: vis,
            runtime_context: r.rt,
            related_routes_or_pages: /^packages\/docs\/src\/pages\//.test(f) ? [f] : [],
            related_env_vars: r.env,
            related_symbols: [...new Set((direct.get(f) || []).map((x) => x.name).filter((x) => x !== d.name))].slice(0, 12),
            used_by_files: [...new Set(importedBy.get(f) || [])].slice(0, 20),
            summary: `${path.basename(f)} 中的 ${d.kind} 符号`,
            typical_queries: [`${d.name} 在哪里定义`, `${d.name} 被谁使用`],
            search_keywords: tokens(f, [d.name, d.kind]),
        });
    }
}

for (const f of tracked.filter((x) => /src\/(index|public-api)\.ts$/.test(x))) {
    for (const s of flat(f)) {
        const df = defFile(f, s) || f;
        addSym({
            record_type: 'symbol_record',
            symbol_name: s,
            symbol_kind: defKinds.get(`${df}::${s}`) || 'public-api',
            defined_in: df,
            exported_from: f,
            module_path: data.get(f).modulePath,
            visibility: 'public',
            runtime_context: data.get(df)?.rt || data.get(f).rt,
            related_routes_or_pages: [],
            related_env_vars: [...new Set([...(data.get(df)?.env || []), ...(data.get(f)?.env || [])])],
            related_symbols: flat(f).filter((x) => x !== s).slice(0, 16),
            used_by_files: [...new Set([...(importedBy.get(f) || []), ...(importedBy.get(df) || [])])].slice(0, 20),
            summary: `${s} 通过 ${f} 对外暴露`,
            typical_queries: [`${s} 的公开导出在哪里`, `${s} 的真实实现在哪`],
            search_keywords: tokens(f, [s, df]),
        });
    }
}

const envMap = new Map();
for (const r of fileRecords) {
    for (const e of r.env_dependencies) {
        if (!envMap.has(e)) envMap.set(e, []);
        envMap.get(e).push(r.file_path);
    }
}

const tsconfigs = tracked.filter((f) => /(^|\/)tsconfig.*\.json$/.test(f));
const aliasRows = [];
for (const f of tsconfigs) {
    try {
        const p = JSON.parse(read(f));
        const paths = p?.compilerOptions?.paths || {};
        for (const [a, t] of Object.entries(paths)) aliasRows.push({ a, t, f });
    } catch {}
}

const routeRecords = [
    {
        record_type: 'route_record',
        route_or_command: '/',
        defined_in: 'packages/docs/src/pages/index.tsx',
        handler_symbol: 'default',
        related_files: ['packages/docs/docusaurus.config.js'],
        request_or_usage_summary: 'Docusaurus 首页路由',
    },
    {
        record_type: 'route_record',
        route_or_command: '/demo',
        defined_in: 'packages/docs/src/pages/demo.tsx',
        handler_symbol: 'default',
        related_files: ['packages/docs/src/components/ui/exampleFrame.tsx'],
        request_or_usage_summary: '文档站示例演示页面',
    },
    {
        record_type: 'route_record',
        route_or_command: '/markdown-page',
        defined_in: 'packages/docs/src/pages/markdown-page.md',
        handler_symbol: 'page-content',
        related_files: ['packages/docs/src/util/markdown.ts'],
        request_or_usage_summary: 'Markdown 页面示例',
    },
    {
        record_type: 'route_record',
        route_or_command: 'yarn build',
        defined_in: 'package.json',
        handler_symbol: 'scripts.build',
        related_files: ['nx.json'],
        request_or_usage_summary: '通过 NX 构建所有可发布包',
    },
    {
        record_type: 'route_record',
        route_or_command: 'yarn test',
        defined_in: 'package.json',
        handler_symbol: 'scripts.test',
        related_files: ['jest.config.ts'],
        request_or_usage_summary: '通过 NX 聚合 Jest 测试',
    },
    {
        record_type: 'route_record',
        route_or_command: 'yarn docs',
        defined_in: 'package.json',
        handler_symbol: 'scripts.docs',
        related_files: ['scripts/docs.mjs', 'typedoc.json'],
        request_or_usage_summary: '生成 TypeDoc 并整理文档产物',
    },
];

const configRecords = [
    {
        record_type: 'config_record',
        config_name: 'workspaces',
        defined_in: 'package.json',
        affects_files: tracked.filter((f) => f.startsWith('packages/')).slice(0, 200),
        default_value: ['packages/*'],
        sensitive: false,
        notes: 'Yarn v1 workspace 根配置',
    },
    {
        record_type: 'config_record',
        config_name: 'node-engine',
        defined_in: 'package.json',
        affects_files: ['package.json', '.github/workflows/main.yml', '.github/workflows/publish.yml'],
        default_value: JSON.parse(read('package.json') || '{}').engines?.node || '>=18',
        sensitive: false,
        notes: '本地与 CI Node 版本下界',
    },
    {
        record_type: 'config_record',
        config_name: 'ts-base',
        defined_in: 'tsconfig.base.json',
        affects_files: tsconfigs,
        default_value: JSON.parse(read('tsconfig.base.json') || '{}').compilerOptions || {},
        sensitive: false,
        notes: '全仓库 TS 编译基线',
    },
    {
        record_type: 'config_record',
        config_name: 'docs-site-config',
        defined_in: 'packages/docs/docusaurus.config.js',
        affects_files: tracked.filter((f) => f.startsWith('packages/docs/src/')).slice(0, 200),
        default_value: 'Docusaurus classic preset',
        sensitive: false,
        notes: '控制 docs 站主题、内容路由与插件',
    },
    {
        record_type: 'config_record',
        config_name: 'env-vars-detected',
        defined_in: '[scan]',
        affects_files: [...new Set([].concat(...[...envMap.values()]))],
        default_value: [...envMap.keys()],
        sensitive: [...envMap.keys()].some((x) => /TOKEN|KEY|SECRET|PASSWORD/.test(x)),
        notes: envMap.size
            ? '源码中直接读取到的环境变量'
            : '未发现显式 .env.example；环境变量读取极少或不存在',
    },
];

const queryRouteRecords = [
    {
        record_type: 'query_route_record',
        query_intent: '入口在哪里',
        query_keywords: ['入口', 'entry', 'public api'],
        recommended_files: [
            'package.json',
            'packages/dockview-core/src/index.ts',
            'packages/dockview/src/index.ts',
            'packages/dockview-vue/src/index.ts',
            'packages/dockview-angular/src/public-api.ts',
        ],
        recommended_symbols: ['DockviewComponent'],
        reason: '先看 workspace 脚本入口，再看各包公开导出入口',
    },
    {
        record_type: 'query_route_record',
        query_intent: '核心布局状态机在哪',
        query_keywords: ['layout', 'dockview component', 'group model'],
        recommended_files: [
            'packages/dockview-core/src/dockview/dockviewComponent.ts',
            'packages/dockview-core/src/dockview/dockviewGroupPanelModel.ts',
        ],
        recommended_symbols: ['DockviewComponent', 'DockviewGroupPanelModel'],
        reason: '核心布局与分组状态都集中在 dockview-core/dockview 子模块',
    },
    {
        record_type: 'query_route_record',
        query_intent: '公开导出在哪定义',
        query_keywords: ['export', 'barrel', 'public api'],
        recommended_files: [
            'packages/dockview-core/src/index.ts',
            'packages/dockview/src/index.ts',
            'packages/dockview-vue/src/index.ts',
            'packages/dockview-angular/src/public-api.ts',
            'packages/dockview-react/src/index.ts',
        ],
        recommended_symbols: ['DockviewComponent'],
        reason: '这些文件是对外暴露面的第一层 re-export 入口',
    },
    {
        record_type: 'query_route_record',
        query_intent: '环境变量在哪读取',
        query_keywords: ['env', 'process.env', 'NODE_ENV'],
        recommended_files: envMap.size
            ? [...new Set([].concat(...[...envMap.values()]))].slice(0, 12)
            : ['packages/docs/web-server/index.mjs', 'packages/docs/docusaurus.config.js'],
        recommended_symbols: [],
        reason: envMap.size
            ? '这些文件直接读取环境变量'
            : '仓库未见显式 env 配置文件，优先检查 docs server 与站点配置',
    },
    {
        record_type: 'query_route_record',
        query_intent: '文档站路由与示例入口在哪',
        query_keywords: ['docs route', 'demo', 'template', 'sandbox'],
        recommended_files: [
            'packages/docs/src/pages/index.tsx',
            'packages/docs/src/pages/demo.tsx',
            'packages/docs/scripts/buildTemplates.mjs',
        ],
        recommended_symbols: ['default'],
        reason: '页面入口与模板构建组成 docs 侧主要导航链路',
    },
    {
        record_type: 'query_route_record',
        query_intent: '发布脚本在哪里',
        query_keywords: ['release', 'publish', 'npm'],
        recommended_files: ['package.json', 'nx.json', '.github/workflows/publish.yml'],
        recommended_symbols: ['scripts.release', 'scripts.release:publish'],
        reason: 'workspace 脚本、NX release 配置和 GitHub Actions 共同构成发布链路',
    },
];

const tree = (() => {
    const rootNode = {};
    for (const f of tracked) {
        let n = rootNode;
        for (const p of f.split('/')) n = n[p] = n[p] || {};
    }
    const render = (n, pre = '') =>
        Object.keys(n)
            .sort((a, b) => a.localeCompare(b))
            .flatMap((k, i, arr) => {
                const last = i === arr.length - 1;
                return [`${pre}${last ? '└─' : '├─'} ${k}`, ...render(n[k], `${pre}${last ? '   ' : '│  '}`)];
            });
    return render(rootNode).join('\n');
})();

const pkgGroups = new Map();
for (const r of fileRecords) {
    if (!pkgGroups.has(r.package_name)) pkgGroups.set(r.package_name, []);
    pkgGroups.get(r.package_name).push(r);
}
for (const arr of pkgGroups.values()) arr.sort((a, b) => a.file_path.localeCompare(b.file_path));

const kinds = [...new Set(fileRecords.map((r) => r.file_kind))]
    .sort()
    .map((k) => `\`${k}\`=${fileRecords.filter((r) => r.file_kind === k).length}`)
    .join('；');
const pkgCounts = [...pkgGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `\`${k}\`=${v.length}`)
    .join('；');

const keyCards = [
    'package.json',
    'nx.json',
    'tsconfig.base.json',
    'tsconfig.json',
    'jest.config.ts',
    '.github/workflows/main.yml',
    '.github/workflows/publish.yml',
    '.github/workflows/deploy-docs.yml',
    '.github/workflows/codeql-analysis.yml',
    'scripts/docs.mjs',
    'scripts/package-docs.js',
    'packages/dockview-core/src/index.ts',
    'packages/dockview-core/src/api/entryPoints.ts',
    'packages/dockview-core/src/dockview/dockviewComponent.ts',
    'packages/dockview-core/src/dockview/dockviewGroupPanelModel.ts',
    'packages/dockview-core/src/dockview/deserializer.ts',
    'packages/dockview-core/src/overlay/overlayRenderContainer.ts',
    'packages/dockview-core/src/popoutWindow.ts',
    'packages/dockview/src/index.ts',
    'packages/dockview/src/dockview/dockview.tsx',
    'packages/dockview-vue/src/index.ts',
    'packages/dockview-vue/src/dockview/dockview.vue',
    'packages/dockview-vue/src/composables/useViewComponent.ts',
    'packages/dockview-react/src/index.ts',
    'packages/dockview-angular/src/public-api.ts',
    'packages/dockview-angular/src/lib/dockview/dockview-angular.component.ts',
    'packages/dockview-angular/src/lib/utils/angular-renderer.ts',
    'packages/docs/package.json',
    'packages/docs/docusaurus.config.js',
    'packages/docs/src/pages/index.tsx',
    'packages/docs/src/pages/demo.tsx',
    'packages/docs/scripts/buildTemplates.mjs',
    'packages/docs/web-server/index.mjs',
].filter((x) => trackedSet.has(x));

const fileLine = (r) =>
    `- file_path: \`${r.file_path}\`; file_kind: \`${r.file_kind}\`; package_name: \`${r.package_name}\`; runtime_context: \`${r.runtime_context}\`; role: \`${r.role}\`; summary: ${r.one_line_summary}; exported_symbols: ${
        r.exported_symbols.length ? r.exported_symbols.slice(0, 10).join(', ') + (r.exported_symbols.length > 10 ? ' ...' : '') : '[]'
    }; imported_from_files: ${r.imported_from_files.slice(0, 5).join(', ') || '[]'}; imported_by_files: ${
        r.imported_by_files.slice(0, 5).join(', ') || '[]'
    }; typical_queries: ${r.typical_queries.join(' / ')}`;

const symLine = (s) =>
    `- symbol_name: \`${s.symbol_name}\`; symbol_kind: \`${s.symbol_kind}\`; defined_in: \`${s.defined_in}\`; exported_from: \`${s.exported_from || '[]'}\`; visibility: \`${s.visibility}\`; summary: ${s.summary}; used_by_files: ${
        s.used_by_files.slice(0, 8).join(', ') || '[]'
    }`;

const routeLine = (r) =>
    `- route_or_command: \`${r.route_or_command}\`; defined_in: \`${r.defined_in}\`; handler_symbol: \`${r.handler_symbol}\`; related_files: ${r.related_files.join(
        ', '
    )}; summary: ${r.request_or_usage_summary}`;

const cfgLine = (r) =>
    `- config_name: \`${r.config_name}\`; defined_in: \`${r.defined_in}\`; affects_files_count: ${(r.affects_files || []).length}; default_value: ${JSON.stringify(
        r.default_value
    )}; sensitive: ${r.sensitive}; notes: ${r.notes}`;

const qrLine = (r) =>
    `- query_intent: \`${r.query_intent}\`; query_keywords: ${r.query_keywords.join(', ')}; recommended_files: ${r.recommended_files.join(
        ', '
    )}; recommended_symbols: ${r.recommended_symbols.join(', ') || '[]'}; reason: ${r.reason}`;

const card = (f) => {
    const r = byPath.get(f);
    return `### \`${f}\`
- 文件类型: \`${r.file_kind}\`
- 所属 package: \`${r.package_name}\`
- 模块路径: \`${r.module_path}\`
- 运行时上下文: \`${r.runtime_context}\`
- 文件职责: ${r.one_line_summary}
- 关键导出: ${r.exported_symbols.slice(0, 20).join(', ') || '[]'}
- 关键导入: ${r.imported_from_files.slice(0, 12).join(', ') || '[]'}
- 依赖它的文件: ${r.imported_by_files.slice(0, 12).join(', ') || '[]'}
- path alias 关系: ${r.path_aliases_used.join(', ') || '[]'}
- 涉及的环境变量: ${r.env_dependencies.join(', ') || '[]'}
- 涉及的 feature / mode / target: ${r.feature_flags_or_modes.join(', ') || '[]'}
- 适合回答的问题: ${r.typical_queries.join('；')}
- 建议阅读前置文件: ${r.imported_from_files.slice(0, 4).join(', ') || '[]'}
- 相关文件: ${[...new Set([...r.imported_from_files.slice(0, 4), ...r.imported_by_files.slice(0, 4)])].join(', ') || '[]'}
- 关键源码证据: \`${f}\`${r.route_or_entry_relevance ? `；入口关联：${r.route_or_entry_relevance}` : ''}
- 待确认项: ${!r.env_dependencies.length && /web-server|docusaurus/.test(f) ? '【待确认】需运行 docs 开发流程后再确认是否存在隐式环境变量分支。' : '无'}
`;
};

const md = `# Dockview AI Index (中文)

生成时间: 2026-03-27

## 1. 索引目标与适用查询场景摘要
- 目标: 为 AI 代码问答、RAG、自动化分析、新人导航与维护交接提供稳定、可检索、可机器消费的代码索引。
- 查询场景: 入口定位、公开导出定位、核心状态机定位、框架包装层定位、构建/测试/发布链路定位、docs 页面与示例入口定位、配置与环境影响范围定位。
- 产物: 本 Markdown 概览 + 完整 JSONL 记录文件 \`docs/manual/dockview-ai-index.records.jsonl\`。
- 覆盖策略: 每个纳入范围的 tracked file 至少对应 1 条 \`file_record\`。

## 2. 项目类型识别结果与依据
- 识别结果: \`monorepo + library/sdk\`，附带一个 \`frontend docs app\`。
- 依据: 根 \`package.json\` 使用 Yarn workspaces；各发布包暴露 \`main/module/types\`；\`packages/docs\` 是 Docusaurus 站点；\`nx.json\` 管理跨包构建与 fixed-version release。

## 3. 索引目录框架
- 第一部分: 索引范围、排除项与项目全景
- 第二部分: 文件级索引
- 第三部分: 符号级索引
- 第四部分: 结构关系索引
- 第五部分: 特殊热点索引
- 第六部分: 测试、示例、构建与 CI 索引
- 第七部分: 查询词典与检索路由
- 第八部分: 机器可读导出设计
- 第九部分: 索引质量要求

## 4. 需要生成的 Mermaid 图清单
- package / module / file 映射图
- 入口链 / 导出链关系图
- 路由 / 页面 / 命令 映射图
- env / config -> file 影响图
- 文件级依赖图
- build / test / release / CI 流程图

## 5. 机器可读索引设计摘要
- 记录类型: \`file_record\`、\`symbol_record\`、\`route_record\`、\`config_record\`、\`query_route_record\`。
- 字段焦点: 文件路径、文件类型、所属 package、运行时上下文、导出符号、导入关系、环境变量依赖、查询关键词、查询意图路由。
- 当前统计: \`${fileRecords.length}\` 条 \`file_record\`，\`${symbolRecords.length}\` 条 \`symbol_record\`，\`${routeRecords.length}\` 条 \`route_record\`，\`${configRecords.length}\` 条 \`config_record\`，\`${queryRouteRecords.length}\` 条 \`query_route_record\`。

# 第一部分：索引范围、排除项与项目全景

## 1. 索引目标、范围、排除项
- 覆盖目录: workspace root、\`packages/*\`、\`.github/workflows\`、\`scripts/\`、docs 包内部 docs/blog/templates/sandboxes/static/src/theme/src/pages。
- 排除目录: \`node_modules/\`、\`dist/\`、\`build/\`、\`coverage/\`、\`.next/\`、\`.nuxt/\`、\`.turbo/\`、\`.nx/\`、\`out/\`、\`.git/\`。
- 特殊排除: \`docs/manual/*\` 被视为生成产物，不回灌进本次索引。
- 索引基线: \`git ls-files\`。

## 2. workspace / package / module / file 全量地图
- workspace 根职责: 管理 Yarn workspace、NX 编排、统一测试/发布/TS/Jest/ESLint/Prettier/TypeDoc 配置。
- package 职责: \`dockview-core\`=核心引擎；\`dockview\`=React；\`dockview-vue\`=Vue；\`dockview-react\`=兼容 re-export；\`dockview-angular\`=Angular；\`dockview-docs\`=Docusaurus 文档站。

### Mermaid 1: package / module / file 映射图

\`\`\`mermaid
flowchart LR
    root["workspace root"] --> core["packages/dockview-core"]
    root --> react["packages/dockview"]
    root --> reactCompat["packages/dockview-react"]
    root --> vue["packages/dockview-vue"]
    root --> ng["packages/dockview-angular"]
    root --> docs["packages/docs"]
    core --> react
    core --> vue
    core --> ng
    react --> reactCompat
    core --> docs
    react --> docs
\`\`\`

### 完整文件树

\`\`\`text
${tree}
\`\`\`

# 第二部分：文件级索引

## 3. 文件级索引总表
- 完整逐文件记录见 \`docs/manual/dockview-ai-index.records.jsonl\`。
- file kind 统计: ${kinds}
- package 统计: ${pkgCounts}

${[...pkgGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkg, arr]) => `### \`${pkg}\` (${arr.length})\n${arr.map(fileLine).join('\n')}`)
    .join('\n\n')}

## 4. 文件级详细索引卡
${keyCards.map(card).join('\n')}

# 第三部分：符号级索引

## 5. 符号级索引
- 完整符号记录已写入 JSONL；以下为当前符号摘录。
${symbolRecords.sort((a, b) => a.symbol_name.localeCompare(b.symbol_name)).map(symLine).join('\n')}

# 第四部分：结构关系索引

## 6. 入口链、导出链与 re-export 映射
- workspace 入口: \`package.json\` scripts。
- 运行时入口: 各包 \`src/index.ts\` 或 \`src/public-api.ts\`。
- build-time / runtime / test-time 入口不同: build 走 root/package scripts 与 bundler config；runtime 走 public entry；test-time 走 Jest config。

### Mermaid 2: 入口链 / 导出链关系图

\`\`\`mermaid
flowchart LR
    consumerCore["consumer import dockview-core"] --> corePkg["packages/dockview-core/src/index.ts"]
    corePkg --> apiEntry["packages/dockview-core/src/api/entryPoints.ts"]
    apiEntry --> coreRuntime["packages/dockview-core/src/dockview/dockviewComponent.ts"]
    consumerReact["consumer import dockview"] --> reactPkg["packages/dockview/src/index.ts"]
    reactPkg --> reactBridge["packages/dockview/src/dockview/dockview.tsx"]
    consumerCompat["consumer import dockview-react"] --> compatPkg["packages/dockview-react/src/index.ts"]
    compatPkg --> reactPkg
    consumerVue["consumer import dockview-vue"] --> vuePkg["packages/dockview-vue/src/index.ts"]
    vuePkg --> vueBridge["packages/dockview-vue/src/dockview/dockview.vue"]
    consumerNg["consumer import dockview-angular"] --> ngPkg["packages/dockview-angular/src/public-api.ts"]
    ngPkg --> ngBridge["packages/dockview-angular/src/lib/dockview/dockview-angular.component.ts"]
\`\`\`

## 7. 路由 / 页面 / 控制器 / 命令 映射
${routeRecords.map(routeLine).join('\n')}

### Mermaid 3: 路由 / 页面 / 命令 映射图

\`\`\`mermaid
flowchart TB
    buildCmd["yarn build"] --> rootPkg["package.json scripts.build"]
    rootPkg --> nxBuild["nx run-many -t build"]
    homeRoute["route /"] --> homePage["packages/docs/src/pages/index.tsx"]
    demoRoute["route /demo"] --> demoPage["packages/docs/src/pages/demo.tsx"]
    markdownRoute["route /markdown-page"] --> markdownPage["packages/docs/src/pages/markdown-page.md"]
\`\`\`

## 8. env / config / mode 到文件的映射
${configRecords.map(cfgLine).join('\n')}
${[...envMap.entries()].map(([e, files]) => `- env_var: \`${e}\`; affects_files: ${files.join(', ')}`).join('\n') || '- 未发现明确的业务环境变量清单；显式读取为空或极少。'}

### Mermaid 4: env / config -> file 影响图

\`\`\`mermaid
flowchart LR
    pkg["package.json"] --> nx["nx.json"]
    tsbase["tsconfig.base.json"] --> tschildren["packages/*/tsconfig*.json"]
    jestRoot["jest.config.ts"] --> jestPkg["packages/*/jest.config.ts"]
    docsCfg["packages/docs/docusaurus.config.js"] --> docsPages["packages/docs/src/pages/*"]
    docsTpl["packages/docs/scripts/buildTemplates.mjs"] --> docsExamples["packages/docs/templates/* and sandboxes/*"]
    envScan["env scan"] --> envTarget["${envMap.size ? [...envMap.keys()].join(', ') : 'no-explicit-env-detected'}"]
\`\`\`

## 9. path alias / module resolution 映射
- tsconfig paths: ${aliasRows.length ? aliasRows.map((x) => `\`${x.a}\` -> ${JSON.stringify(x.t)} @ ${x.f}`).join('；') : '未发现 TS `compilerOptions.paths`。'}
- 非 TS alias: docs 包使用 Docusaurus 构建别名 \`@site\`、\`@theme\`、\`@generated\`。
- workspace 跨包入口映射: ${Object.entries(wsEntry).map(([k, v]) => `\`${k}\` -> \`${v}\``).join('；')}

### Mermaid 5: 文件级依赖图

\`\`\`mermaid
flowchart LR
    coreIndex["packages/dockview-core/src/index.ts"] --> apiEntry["packages/dockview-core/src/api/entryPoints.ts"]
    apiEntry --> dockComp["packages/dockview-core/src/dockview/dockviewComponent.ts"]
    dockComp --> groupModel["packages/dockview-core/src/dockview/dockviewGroupPanelModel.ts"]
    dockComp --> deser["packages/dockview-core/src/dockview/deserializer.ts"]
    dockComp --> overlay["packages/dockview-core/src/overlay/overlayRenderContainer.ts"]
    reactDock["packages/dockview/src/dockview/dockview.tsx"] --> coreIndex
    vueDock["packages/dockview-vue/src/dockview/dockview.vue"] --> coreIndex
    ngDock["packages/dockview-angular/src/lib/dockview/dockview-angular.component.ts"] --> coreIndex
\`\`\`

# 第五部分：特殊热点索引

## 10. 特殊热点清单
- \`packages/dockview-core/src/index.ts\`: barrel 汇总 core 公开导出；关键词: export, barrel, public api；风险: breaking change 面最大。
- \`packages/dockview-react/src/index.ts\`: 兼容包整体 re-export；关键词: compatibility, re-export；风险: 与 \`dockview\` 导出漂移联动。
- \`packages/docs/scripts/buildTemplates.mjs\`: 模板与 sandboxes 生成脚本；关键词: templates, sandboxes, buildTemplates；风险: 示例与文档脱节。
- \`packages/dockview-core/src/dockview/deserializer.ts\`: 反序列化热点；关键词: deserialize, snapshot, restore；风险: 状态兼容。
- \`packages/dockview-core/src/popoutWindow.ts\`: 浏览器 window 依赖；关键词: popout, window；风险: 多窗口兼容性。
- \`packages/dockview-core/src/overlay/overlayRenderContainer.ts\`: 拖拽 overlay 热点；关键词: overlay, drag, drop；风险: 事件与视觉反馈耦合。
- \`packages/docs/src/generated/api.output.json\`: generated 文档 API 产物；关键词: generated api output；风险: 可能与源码不同步。
- \`packages/docs/web-server/index.mjs\`: Node 开发 server；关键词: docs server, esm server；风险: 本地开发环境差异。

# 第六部分：测试、示例、构建与 CI 索引

## 11. tests / e2e / examples / scripts / CI 索引
### tests
${fileRecords.filter((r) => r.file_kind === 'test').map((r) => `- \`${r.file_path}\`: ${r.one_line_summary}; package=\`${r.package_name}\``).join('\n')}

### examples
${fileRecords.filter((r) => r.file_kind === 'example').map((r) => `- \`${r.file_path}\`: ${r.one_line_summary}; package=\`${r.package_name}\``).join('\n')}

### scripts
${fileRecords.filter((r) => r.file_kind === 'script').map((r) => `- \`${r.file_path}\`: ${r.one_line_summary}; runtime=\`${r.runtime_context}\``).join('\n')}

### CI
${fileRecords.filter((r) => r.file_kind === 'ci').map((r) => `- \`${r.file_path}\`: ${r.one_line_summary}`).join('\n')}

### Mermaid 6: build / test / release / CI 流程图

\`\`\`mermaid
flowchart TB
    localBuild["yarn build"] --> nxBuild["nx run-many build"]
    localTest["yarn test"] --> nxTest["nx run-many test"]
    localDocs["yarn docs"] --> typedoc["typedoc"]
    typedoc --> docsScript["scripts/docs.mjs"]
    pushMain["push or PR"] --> ciMain[".github/workflows/main.yml"]
    pushMain --> codeql[".github/workflows/codeql-analysis.yml"]
    docsChange["docs publish"] --> ciDocs[".github/workflows/deploy-docs.yml"]
    releaseEvt["release publish"] --> ciPublish[".github/workflows/publish.yml"]
\`\`\`

# 第七部分：查询词典与检索路由

## 12. 查询关键词词典与检索路由
${queryRouteRecords.map(qrLine).join('\n')}

# 第八部分：机器可读导出设计

## 13. 机器可读索引
- JSONL 文件: \`docs/manual/dockview-ai-index.records.jsonl\`
- 字段说明:
  - \`file_record\`: file_path, file_kind, package_name, module_path, runtime_context, role, one_line_summary, exported_symbols, imported_from_files, imported_by_files, env_dependencies, search_keywords, typical_queries。
  - \`symbol_record\`: symbol_name, symbol_kind, defined_in, exported_from, module_path, related_symbols, used_by_files, summary, search_keywords, typical_queries。
  - \`route_record\`: route_or_command, defined_in, handler_symbol, related_files, request_or_usage_summary。
  - \`config_record\`: config_name, defined_in, affects_files, default_value, sensitive, notes。
  - \`query_route_record\`: query_intent, query_keywords, recommended_files, recommended_symbols, reason。

### file_record 示例

\`\`\`json
${JSON.stringify(fileRecords.find((r) => r.file_path === 'packages/dockview-core/src/dockview/dockviewComponent.ts') || fileRecords[0], null, 2)}
\`\`\`

### symbol_record 示例

\`\`\`json
${JSON.stringify(symbolRecords.find((r) => r.symbol_name === 'DockviewComponent') || symbolRecords[0], null, 2)}
\`\`\`

### query_route_record 示例

\`\`\`json
${JSON.stringify(queryRouteRecords[0], null, 2)}
\`\`\`

# 第九部分：索引质量要求

## 14. 索引质量要求
- file_record 覆盖数: \`${fileRecords.length}\`，与当前纳入范围 tracked files 数量一致。
- 路径精度: 使用仓库相对路径，适合后续拼接绝对路径与 IDE 导航。
- public export / internal / barrel / generated / config / test 已区分。
- 核心文件提供增强卡；普通文件提供最小索引项。
- 待确认项:
- ${aliasRows.length ? '无 TS paths 待确认。' : '【待确认】未在 tsconfig 中发现 compilerOptions.paths；docs 包使用的 @site/@theme/@generated 为 Docusaurus 别名而非 TS paths。'}
- ${envMap.size ? '显式环境变量已收录。' : '【待确认】仓库未提供 .env.example，当前仅确认显式环境变量读取极少或不存在。'}
- 【推断】packages/docs/templates 与 packages/docs/sandboxes 的转换关系依赖 packages/docs/scripts/buildTemplates.mjs 的运行结果。
`;

const jsonl =
    [...fileRecords, ...symbolRecords, ...routeRecords, ...configRecords, ...queryRouteRecords]
        .map((x) => JSON.stringify(x))
        .join('\n') + '\n';

fs.writeFileSync(path.join(outDir, 'dockview-ai-index.zh-CN.md'), md, 'utf8');
fs.writeFileSync(path.join(outDir, 'dockview-ai-index.records.jsonl'), jsonl, 'utf8');

console.log(
    JSON.stringify(
        {
            filesIndexed: fileRecords.length,
            symbolRecords: symbolRecords.length,
            routeRecords: routeRecords.length,
            configRecords: configRecords.length,
            queryRouteRecords: queryRouteRecords.length,
            markdown: 'docs/manual/dockview-ai-index.zh-CN.md',
            jsonl: 'docs/manual/dockview-ai-index.records.jsonl',
        },
        null,
        2
    )
);
