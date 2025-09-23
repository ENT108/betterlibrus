'use client';

import { useEffect, useState } from 'react';
import { Home, Calendar, Star, ListChecks, FileText, Bell, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { View } from '@/lib/types';

interface BottomNavProps {
  readonly activeView: View;
  readonly onNavigate: (view: View) => void;
}

const navItems = [
  { view: 'Home', icon: Home, label: 'Home' },
  { view: 'Timetable', icon: Calendar, label: 'Timetable' },
  { view: 'Grades', icon: Star, label: 'Grades' },
  { view: 'Absences', icon: ListChecks, label: 'Absences' },
  { view: 'Exams', icon: FileText, label: 'Exams' },
  { view: 'Messages', icon: Mail, label: 'Messages' },
  { view: 'Announcements', icon: Bell, label: 'Announcements' },
] as const;

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  type NavItem = typeof navItems[number];
  const getVisibleItems = (): NavItem[] => {
    if (typeof window === 'undefined') return Array.from(navItems);
    try {
      const raw = localStorage.getItem('nav-visibility');
      if (!raw) return Array.from(navItems);
      const prefs = JSON.parse(raw) as Partial<Record<typeof navItems[number]['view'], boolean>>;
      return Array.from(navItems).filter((item) => prefs[item.view] !== false);
    } catch (error) {
      console.error('Failed to read nav visibility from storage', error);
      return Array.from(navItems);
    }
  };

  const [visibleItems, setVisibleItems] = useState<NavItem[]>(getVisibleItems());

  useEffect(() => {
    const update = () => setVisibleItems(getVisibleItems());
    window.addEventListener('storage', update);
    window.addEventListener('nav-visibility-changed', update as EventListener);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('nav-visibility-changed', update as EventListener);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 h-16 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto h-full max-w-4xl">
        <div className="flex h-full items-center justify-around overflow-x-auto">
          {visibleItems.map(item => {
            const isActive = activeView === item.view;
            return (
              <div key={item.view} className="relative flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-lg transition-colors"
                  onClick={() => onNavigate(item.view)}
                  aria-label={item.label}
                >
                  <item.icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
                </Button>
                {isActive && <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
