import React from 'react';
import { Terminal, Download, Github, ExternalLink, Monitor, Package, Play } from 'lucide-react';

const DeploymentGuide: React.FC = () => {
  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar p-8 max-w-3xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">本地部署指南</h1>
        <p className="text-lg text-slate-600">
          您可以轻松地将此 Web 桌面环境部署到您的本地 Windows 机器上，甚至将其打包为原生的 .exe 应用程序。
        </p>
      </header>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Terminal className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">1. 基础部署 (Node.js)</h2>
        </div>
        <div className="space-y-4">
          <p className="text-slate-700">首先确保您的电脑已安装 Node.js。然后执行以下步骤：</p>
          <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm space-y-2">
            <p># 克隆或下载源代码</p>
            <p>git clone https://github.com/your-repo/win11-web-desktop.git</p>
            <p>cd win11-web-desktop</p>
            <p className="mt-4"># 安装依赖</p>
            <p>npm install</p>
            <p className="mt-4"># 启动开发服务器</p>
            <p>npm run dev</p>
          </div>
          <p className="text-sm text-slate-500 italic">
            提示：启动后，在浏览器访问 http://localhost:3000 即可。
          </p>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold">2. 打包为 Windows 桌面应用 (.exe)</h2>
        </div>
        <p className="text-slate-700 mb-6">
          使用 <strong>Electron</strong> 或 <strong>Tauri</strong> 可以将此项目转换为真正的 Windows 桌面程序。
        </p>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-2xl p-6 hover:border-win-accent transition-colors group">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              Electron <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-500 mb-4">最流行、生态最丰富的跨平台桌面应用框架。</p>
            <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs">
              npm install --save-dev electron
            </div>
          </div>
          
          <div className="border border-slate-200 rounded-2xl p-6 hover:border-win-accent transition-colors group">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              Tauri <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-500 mb-4">更轻量、更安全、性能更佳的现代替代方案。</p>
            <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs">
              npx tauri init
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 bg-win-accent/5 border border-win-accent/10 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="w-6 h-6 text-win-accent" />
          <h2 className="text-xl font-bold text-win-accent">为什么选择 Web 技术构建桌面应用？</h2>
        </div>
        <ul className="space-y-3 text-slate-700">
          <li className="flex gap-2">
            <span className="text-win-accent font-bold">✓</span>
            <span><strong>跨平台：</strong> 一套代码，同时运行在 Windows, macOS 和 Linux。</span>
          </li>
          <li className="flex gap-2">
            <span className="text-win-accent font-bold">✓</span>
            <span><strong>UI 灵活性：</strong> 利用 CSS 强大的能力轻松实现复杂的视觉效果（如 Mica, Blur）。</span>
          </li>
          <li className="flex gap-2">
            <span className="text-win-accent font-bold">✓</span>
            <span><strong>快速迭代：</strong> 热重载技术让开发效率提升数倍。</span>
          </li>
        </ul>
      </section>

      <footer className="text-center py-8 border-t border-slate-100">
        <button className="bg-win-accent text-white px-8 py-3 rounded-full font-bold hover:bg-win-accent-hover transition-all flex items-center gap-2 mx-auto">
          <Download className="w-5 h-5" /> 下载部署包
        </button>
      </footer>
    </div>
  );
};

export default DeploymentGuide;
