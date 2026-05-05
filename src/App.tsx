/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Info,
  X,
  Clock,
  Filter,
  FileText,
  ChevronRight,
  User,
  FileType
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Announcement, SearchFilters } from './types';
import { cn, storage, excelUtils, wordUtils } from './lib/utils';

export default function App() {
  const CATEGORIES = ['臨床公告', '儀器', '教育', '稽核', '一般'];

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({ keyword: '', date: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    category: '臨床公告',
    date: format(new Date(), 'yyyy-MM-dd'),
    author: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    const saved = storage.getAnnouncements();
    if (saved.length === 0) {
      // Mock some initial data if empty
      const mock: Announcement[] = [
        {
          id: '1',
          date: format(new Date(), 'yyyy-MM-dd'),
          category: '公告',
          title: '歡迎使用公佈欄',
          content: '這是一個現代化的每日公佈欄。您可以點擊右上角的「新增事項」來建立公告，或使用「匯入」功能。支援 Excel 與 Word 檔案。',
          author: '系統管理員',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      setAnnouncements(mock);
      storage.saveAnnouncements(mock);
    } else {
      setAnnouncements(saved);
    }
  }, []);

  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter(item => {
        const matchesKeyword = 
          item.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          item.content.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          item.category.toLowerCase().includes(filters.keyword.toLowerCase());
        
        const matchesDate = !filters.date || item.date === filters.date;
        
        return matchesKeyword && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || 
                       new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements, filters]);

  const handleSave = () => {
    if (!formData.title || !formData.date) return;

    let newAnnouncements: Announcement[];
    if (editingItem) {
      newAnnouncements = announcements.map(item => 
        item.id === editingItem.id 
          ? { 
              ...editingItem, 
              ...formData, 
              updatedAt: new Date().toISOString() 
            } as Announcement 
          : item
      );
    } else {
      const newItem: Announcement = {
        id: crypto.randomUUID(),
        title: formData.title || '',
        content: formData.content || '',
        category: formData.category || '一般',
        date: formData.date || '',
        author: formData.author || '匿名',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newAnnouncements = [newItem, ...announcements];
    }

    setAnnouncements(newAnnouncements);
    storage.saveAnnouncements(newAnnouncements);
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除這筆事項嗎？')) {
      const updated = announcements.filter(item => item.id !== id);
      setAnnouncements(updated);
      storage.saveAnnouncements(updated);
    }
  };

  const handleOpenModal = (item?: Announcement) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        content: item.content,
        category: item.category,
        date: item.date,
        author: item.author
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        content: '',
        category: CATEGORIES[0],
        date: format(new Date(), 'yyyy-MM-dd'),
        author: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await excelUtils.importFromExcel(file);
      processImportedData(imported);
      alert('Excel 匯入成功！');
    } catch (err) {
      console.error(err);
      alert('匯入失敗，請檢查檔案格式。');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowImportMenu(false);
    }
  };

  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await wordUtils.importFromWord(file);
      processImportedData(imported);
      alert('Word 匯入成功！');
    } catch (err) {
      console.error(err);
      alert('匯入失敗：' + (err instanceof Error ? err.message : '請檢查檔案格式。'));
    } finally {
      if (wordInputRef.current) wordInputRef.current.value = '';
      setShowImportMenu(false);
    }
  };

  const processImportedData = (data: Partial<Announcement>[]) => {
    const newItems: Announcement[] = data.map(item => ({
      id: crypto.randomUUID(),
      title: item.title || '無標題',
      content: item.content || '',
      category: item.category || '一般',
      date: item.date || format(new Date(), 'yyyy-MM-dd'),
      author: item.author || '系統匯入',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const updated = [...newItems, ...announcements];
    setAnnouncements(updated);
    storage.saveAnnouncements(updated);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">公告速遞</h1>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest leading-none">Daily Bulletin v1.1</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowImportMenu(!showImportMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 flex items-center gap-2 text-sm cursor-pointer"
              >
                <Upload size={18} />
                <span className="hidden sm:inline">匯入</span>
              </button>
              <AnimatePresence>
                {showImportMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowImportMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2"
                    >
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileType size={14} className="text-green-600" /> Excel 格式
                      </button>
                      <button 
                        onClick={() => wordInputRef.current?.click()}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileType size={14} className="text-blue-600" /> Word 格式
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls" />
              <input type="file" ref={wordInputRef} onChange={handleImportWord} className="hidden" accept=".docx" />
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 flex items-center gap-2 text-sm cursor-pointer"
              >
                <Download size={18} />
                <span className="hidden sm:inline">匯出</span>
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2"
                    >
                      <button 
                        onClick={() => { excelUtils.exportToExcel(announcements); setShowExportMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileType size={14} className="text-green-600" /> Excel 格式
                      </button>
                      <button 
                        onClick={() => { wordUtils.exportToWord(announcements); setShowExportMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileType size={14} className="text-blue-600" /> Word 格式
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-[1px] h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => handleOpenModal()}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">新增事項</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜尋標題、內容或類別..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm min-w-[170px]"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <button 
              onClick={() => setFilters({ keyword: '', date: '' })}
              className="px-4 py-2 text-sm text-gray-500 hover:text-orange-500 transition-colors cursor-pointer"
            >
              重設
            </button>
          </div>
        </section>

        {/* List Content */}
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[11px] font-bold rounded-full uppercase tracking-wider">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                          <CalendarIcon size={14} />
                          {item.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-2 group-hover:text-orange-500 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap mb-6 line-clamp-3">
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{item.author}</p>
                          <p className="text-[10px] text-gray-400">發布人員</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <Clock size={12} />
                        最後更新: {format(parseISO(item.updatedAt), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Filter size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">找不到符合的事項</h3>
                <p className="text-gray-500 mt-1">請嘗試更換關鍵字或日期篩選</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm shadow-none"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingItem ? '編輯事項' : '新增事項'} 
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-mono rounded border border-orange-100">
                    DRAFT
                  </span>
                </h2>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">標題</label>
                  <input
                    type="text"
                    required
                    placeholder="輸入事項標題..."
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">日期</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">類別</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">詳細內容</label>
                  <textarea
                    rows={4}
                    placeholder="輸入詳細說明事項..."
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">發布人</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="您的姓名或職稱..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  儲存公告
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Info */}
      <div className="fixed bottom-6 right-6">
        <div className="group relative">
          <div className="absolute bottom-full right-0 mb-4 scale-0 group-hover:scale-100 transition-all origin-bottom-right">
            <div className="bg-gray-900 text-white p-4 rounded-2xl w-64 shadow-2xl text-xs leading-relaxed border border-white/10">
              <p className="font-bold mb-2 flex items-center gap-2">
                <Info size={14} className="text-orange-400" /> 
                小撇步
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex gap-2"><ChevronRight size={10} className="mt-1 flex-shrink-0" /> 使用 Excel 匯出可備份資料</li>
                <li className="flex gap-2"><ChevronRight size={10} className="mt-1 flex-shrink-0" /> 匯入 Excel 時，請確保標題列包含「日期」、「標題」、「內容」等關鍵字</li>
              </ul>
            </div>
          </div>
          <button className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-all hover:rotate-12 cursor-help">
            <Info size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
