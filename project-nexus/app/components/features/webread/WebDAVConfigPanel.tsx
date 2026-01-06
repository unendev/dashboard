'use client';

import { useState } from 'react';
import { setWebDAVConfig, getWebDAVConfig, testWebDAVConnection } from '@/lib/webdav-config';
import { getAIConfig, setAIConfig, getProviderModels, getProviderBaseUrl, getProviderConfig, AIConfig, getAIRoles, setAIRoles, AIRole } from '@/lib/ai-config';
import * as webdavCache from '@/lib/webdav-cache';
import { Settings, Check, X, Loader2, RefreshCw, Sparkles, Server, Plus, Trash2, User } from 'lucide-react';

type ConfigTab = 'webdav' | 'ai' | 'roles';

export default function WebDAVConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>('webdav');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null);
  
  // WebDAV 配置
  const config = getWebDAVConfig();
  const [formData, setFormData] = useState(config);
  
  // AI 配置
  const aiConfig = getAIConfig();
  const [aiFormData, setAiFormData] = useState<AIConfig>(aiConfig);
  const [aiSaved, setAiSaved] = useState(false);

  // 角色配置
  const [roles, setRoles] = useState<AIRole[]>(() => getAIRoles());
  const [editingRole, setEditingRole] = useState<AIRole | null>(null);
  const [rolesSaved, setRolesSaved] = useState(false);

  const handleSave = () => {
    setWebDAVConfig(formData);
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      setWebDAVConfig(formData);
      const result = await testWebDAVConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await webdavCache.syncBooksFromCloud();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({ synced: 0, failed: 0, total: 0 });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAI = () => {
    setAIConfig(aiFormData);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  const handleProviderChange = (provider: AIConfig['provider']) => {
    // 加载该 provider 已保存的配置（包括 API Key）
    const savedConfig = getProviderConfig(provider);
    setAiFormData(savedConfig);
  };

  // 角色管理
  const handleAddRole = () => {
    const newRole: AIRole = {
      id: `role-${Date.now()}`,
      name: '新角色',
      systemPrompt: '请简洁地解释选中的内容。',
    };
    setEditingRole(newRole);
  };

  const handleSaveRole = () => {
    if (!editingRole) return;
    
    const existingIndex = roles.findIndex(r => r.id === editingRole.id);
    let newRoles: AIRole[];
    
    if (existingIndex >= 0) {
      newRoles = [...roles];
      newRoles[existingIndex] = editingRole;
    } else {
      newRoles = [...roles, editingRole];
    }
    
    setRoles(newRoles);
    setAIRoles(newRoles);
    setEditingRole(null);
    setRolesSaved(true);
    setTimeout(() => setRolesSaved(false), 2000);
  };

  const handleDeleteRole = (roleId: string) => {
    if (roleId === 'default') return; // 不能删除默认角色
    const newRoles = roles.filter(r => r.id !== roleId);
    setRoles(newRoles);
    setAIRoles(newRoles);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="设置"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/80 backdrop-blur border border-white/10 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-amber-100">阅读器设置</h2>

            {/* 标签页切换 */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('webdav')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === 'webdav'
                    ? 'bg-slate-700 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" />
                WebDAV
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-slate-700 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === 'roles'
                    ? 'bg-slate-700 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                角色
              </button>
            </div>

            {/* WebDAV 配置 */}
            {activeTab === 'webdav' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">WebDAV URL</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="http://localhost:8080/webdav"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">用户名</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">电子书路径</label>
                  <input
                    type="text"
                    value={formData.ebookPath}
                    onChange={(e) => setFormData({ ...formData, ebookPath: e.target.value })}
                    placeholder="/ebooks"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {testResult !== null && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    testResult
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-200 border border-red-500/30'
                  }`}>
                    {testResult ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="text-sm">{testResult ? '连接成功！' : '连接失败'}</span>
                  </div>
                )}

                {syncResult !== null && (
                  <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <p className="text-sm text-blue-200">
                      同步完成：{syncResult.synced} 本已同步，{syncResult.failed} 本失败
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleTest} disabled={isTesting}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-white/10 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : '测试连接'}
                  </button>
                  <button onClick={handleSync} disabled={isSyncing}
                    className="flex-1 px-3 py-2 bg-emerald-600/80 border border-emerald-500/30 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" />同步</>}
                  </button>
                  <button onClick={handleSave}
                    className="flex-1 px-3 py-2 bg-amber-600/80 border border-amber-500/30 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm">
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* AI 配置 */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">启用 AI 助手</label>
                  <button
                    onClick={() => setAiFormData({ ...aiFormData, enabled: !aiFormData.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      aiFormData.enabled ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      aiFormData.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">AI 提供商</label>
                  <select
                    value={aiFormData.provider}
                    onChange={(e) => handleProviderChange(e.target.value as AIConfig['provider'])}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                  <input
                    type="password"
                    value={aiFormData.apiKey}
                    onChange={(e) => setAiFormData({ ...aiFormData, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {aiFormData.provider === 'deepseek' && '从 platform.deepseek.com 获取'}
                    {aiFormData.provider === 'gemini' && '从 aistudio.google.com 获取'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">模型</label>
                  <select
                    value={aiFormData.model}
                    onChange={(e) => setAiFormData({ ...aiFormData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {getProviderModels(aiFormData.provider).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {aiFormData.provider === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={aiFormData.baseUrl}
                      onChange={(e) => setAiFormData({ ...aiFormData, baseUrl: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                )}

                {aiSaved && (
                  <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">AI 配置已保存</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveAI}
                    className="flex-1 px-3 py-2 bg-amber-600/80 border border-amber-500/30 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm">
                    保存 AI 配置
                  </button>
                </div>

                <div className="bg-slate-700/50 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-100">
                  <p className="font-semibold mb-1">💡 使用说明：</p>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    <li>阅读时选中文字即可自动获取 AI 解释</li>
                    <li>支持翻译、解释、背景知识等</li>
                    <li>API Key 仅保存在本地浏览器中</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 角色配置 */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                {editingRole ? (
                  // 编辑角色
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">角色名称</label>
                      <input
                        type="text"
                        value={editingRole.name}
                        onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">系统提示词</label>
                      <textarea
                        value={editingRole.systemPrompt}
                        onChange={(e) => setEditingRole({ ...editingRole, systemPrompt: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                        placeholder="描述这个角色如何回答问题..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRole(null)}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-white/10 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveRole}
                        className="flex-1 px-3 py-2 bg-amber-600/80 border border-amber-500/30 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  // 角色列表
                  <>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-3 bg-slate-700/50 border border-white/10 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200">{role.name}</p>
                            <p className="text-xs text-slate-400 truncate">{role.systemPrompt}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => setEditingRole(role)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-600 rounded transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {role.id !== 'default' && (
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleAddRole}
                      className="w-full px-3 py-2 bg-slate-700 border border-dashed border-white/20 text-slate-300 rounded-lg hover:bg-slate-600 hover:border-white/30 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      添加角色
                    </button>

                    {rolesSaved && (
                      <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">角色已保存</span>
                      </div>
                    )}

                    <div className="bg-slate-700/50 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-100">
                      <p className="font-semibold mb-1">💡 角色说明：</p>
                      <ul className="space-y-1 list-disc list-inside text-slate-300">
                        <li>每本书可以选择不同的 AI 角色</li>
                        <li>角色决定 AI 如何回答你的问题</li>
                        <li>在阅读时点击角色名可切换</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 关闭按钮 */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
