'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '@/context/app-context';
import { scrollToSection } from '@/lib/utils';
import type { Section } from '@/lib/types';

interface CommandOption {
  id: string;
  label: string;
  description: string;
  action: () => void;
  keywords: string[];
}

export function KeyboardCommandsModal() {
  const { state, toggleCommandsModal, openContactModal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigateToSection = useCallback((section: Section) => {
    scrollToSection(section);
    toggleCommandsModal();
    setSearchQuery('');
    setSelectedIndex(0);
  }, [toggleCommandsModal]);

  const handleOpenContact = useCallback(() => {
    openContactModal(window.innerWidth / 2, window.innerHeight / 3);
    toggleCommandsModal();
    setSearchQuery('');
    setSelectedIndex(0);
  }, [openContactModal, toggleCommandsModal]);

  const commandOptions: CommandOption[] = useMemo(() => [
    {
      id: 'home',
      label: 'Home',
      description: 'Navigate to home section',
      action: () => navigateToSection('home'),
      keywords: ['home', 'main', 'start'],
    },
    {
      id: 'about',
      label: 'About',
      description: 'Navigate to about section',
      action: () => navigateToSection('about'),
      keywords: ['about', 'info', 'information'],
    },
    {
      id: 'contact',
      label: 'Contact',
      description: 'Navigate to contact section',
      action: () => navigateToSection('contact'),
      keywords: ['contact', 'email', 'reach'],
    },
    {
      id: 'contact-modal',
      label: 'Request contact information',
      description: 'Ready to collaborate',
      action: handleOpenContact,
      keywords: ['contact', 'collaborate', 'reach out', 'email', 'form'],
    },
    {
      id: 'download-resume',
      label: 'Download Resume',
      description: 'Download resume as PDF',
      action: () => {
        const link = document.createElement('a');
        link.href = '/data/documents/mannan-javid-resume.pdf';
        link.download = 'mannan-javid-resume.pdf';
        link.click();
        toggleCommandsModal();
        setSearchQuery('');
        setSelectedIndex(0);
      },
      keywords: ['resume', 'cv', 'download', 'pdf'],
    },
  ], [navigateToSection, handleOpenContact, toggleCommandsModal]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return commandOptions;
    return commandOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query) ||
        option.keywords.some((keyword) => keyword.includes(query))
    );
  }, [searchQuery, commandOptions]);

  const close = useCallback(() => {
    if (state.commandsModalOpen) {
      toggleCommandsModal();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [state.commandsModalOpen, toggleCommandsModal]);

  useEffect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      const isInInput = (event.target as HTMLElement)?.tagName === 'INPUT' ||
                        (event.target as HTMLElement)?.tagName === 'TEXTAREA';

      if (event.key === '/' && !state.commandsModalOpen && !isInInput) {
        event.preventDefault();
        toggleCommandsModal();
        return;
      }

      if (event.key === 'Escape' && state.commandsModalOpen) {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, [state.commandsModalOpen, toggleCommandsModal, close]);

  useEffect(() => {
    if (state.commandsModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.commandsModalOpen]);

  const handleInputKeydown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredOptions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (event.key === 'Enter' && filteredOptions.length > 0) {
      event.preventDefault();
      filteredOptions[selectedIndex].action();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  if (!state.commandsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[20vh] px-4">
      <div className="absolute inset-0 bg-black/75" onClick={close} />

      <div className="relative w-full max-w-2xl bg-[#141414] border border-[#222] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search commands..."
          className="w-full px-6 py-4 text-lg border-b border-[#222] focus:outline-none bg-transparent text-gray-100 placeholder-gray-500"
          onKeyDown={handleInputKeydown}
        />

        <div className="max-h-[400px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No results found</div>
          ) : (
            <div className="py-2">
              {filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => option.action()}
                  className={`w-full px-6 py-3 text-left transition-colors ${
                    index === selectedIndex ? 'bg-[#039be5]/20' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="font-medium text-gray-100">{option.label}</div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#222] text-xs text-gray-500 flex items-center justify-between">
          <div className="flex gap-3">
            <div>
              <kbd className="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">↑↓</kbd>
              <span className="ml-1.5">Navigate</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">Enter</kbd>
              <span className="ml-1.5">Select</span>
            </div>
          </div>
          <div>
            <kbd className="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">Esc</kbd>
            <span className="ml-1.5">Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
