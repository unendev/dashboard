"use client";
import { useState, useEffect } from 'react';
import { Conversation } from '@prisma/client';
import { NewConversationButton } from '../components/learning/NewConversationButton';
import { DeleteConversationButton } from '../components/learning/DeleteConversationButton';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';

interface RussianLayoutClientProps {
  conversations: (Conversation)[];
  children: React.ReactNode;
}

export function RussianLayoutClient({ conversations, children }: RussianLayoutClientProps) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Overlay for mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out md:relative 
          ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          ${isDesktopSidebarOpen ? 'md:translate-x-0 md:w-64' : 'md:translate-x-0 md:w-0 md:border-r-0'}
        `}
      >
        <div className={`flex flex-col h-full ${!isDesktopSidebarOpen && 'md:hidden'}`}>
           <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
             <h2 className="font-bold text-gray-700 dark:text-gray-200">历史对话</h2>
             <button 
               onClick={() => setDesktopSidebarOpen(false)} 
               className="hidden md:block text-gray-500 hover:text-gray-300"
               title="Collapse Sidebar"
             >
               <PanelLeftClose size={18} />
             </button>
           </div>
           
           <div className="p-4">
             <NewConversationButton />
           </div>

           <nav className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
             <ul>
               {conversations.map((convo) => (
                 <li key={convo.id} className="flex items-center justify-between group">
                   <Link 
                     href={`/russian/${convo.id}`} 
                     className="flex-grow block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 truncate transition-colors"
                     onClick={() => setMobileSidebarOpen(false)}
                   >
                     {convo.title}
                   </Link>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
                     <DeleteConversationButton conversationId={convo.id} conversationTitle={convo.title} />
                   </div>
                 </li>
               ))}
             </ul>
                   </nav>
                   
                 </div>      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
        {/* Toggle Button for Desktop (Visible when sidebar is closed) */}
        {!isDesktopSidebarOpen && (
          <div className="absolute top-4 left-4 z-20 hidden md:block">
            <button
              onClick={() => setDesktopSidebarOpen(true)}
              className="p-2 rounded-md bg-gray-800 text-gray-400 hover:text-white border border-gray-700 shadow-sm"
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={20} />
            </button>
          </div>
        )}

        
        {/* Children Wrapper - No padding, full height for layout control */}
        <div className="flex-grow overflow-hidden h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

