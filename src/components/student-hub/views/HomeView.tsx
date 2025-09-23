
'use client';
import { useState, useEffect } from 'react';
import type { Lesson, DetailItem, Day, SubjectGrade, Message } from '@/lib/types';
import { Section } from '@/components/student-hub/Section';
import { getTimetable, getGrades, getMessages } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NewGradesList } from '@/components/student-hub/NewGradesList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useLanguage } from '@/contexts/LanguageContext';


interface HomeViewProps {
    onOpenSheet: (item: DetailItem) => void;
}

function getDayOfWeek(date: Date): 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' {
    const day = date.getDay();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
    const today = days[day];
    if (today === 'SAT' || today === 'SUN') return 'MON'; // Default to Monday on weekends
    return today;
}

export function HomeView({ onOpenSheet }: Readonly<HomeViewProps>) {
    const [isLoading, setIsLoading] = useState(true);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [grades, setGrades] = useState<SubjectGrade[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { anonymizeName } = usePrivacy();
    const { t } = useLanguage();

    const getDayName = (dayKey: Day): string => {
        const names = {
            MON: t('timetable.monday'),
            TUE: t('timetable.tuesday'),
            WED: t('timetable.wednesday'),
            THU: t('timetable.thursday'),
            FRI: t('timetable.friday')
        };
        return names[dayKey];
    };

    useEffect(() => {
        async function loadData() {
            try {
                const [timetableData, gradesData, messagesResponse] = await Promise.all([
                    getTimetable(),
                    getGrades(),
                    getMessages('5').catch(() => ({ messages: [], pagination: {} })) // Inbox folder (5), gracefully handle errors
                ]);
                setLessons(timetableData);
                setGrades(gradesData);
                setMessages(messagesResponse.messages || []);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();

        const interval = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <Section title={t('home.nextLesson')}>
                    <div className="px-4 md:px-0">
                        <div className="p-4 flex justify-between items-center rounded-lg border bg-card">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                            <div className="text-right space-y-2">
                                <Skeleton className="h-5 w-24" />
                            </div>
                        </div>
                    </div>
                </Section>
                <Section title={t('home.newGrades')}>
                    <div className="px-4 md:px-0">
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex space-x-3">
                                <Skeleton className="h-10 w-10 rounded-md" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                            </div>
                        </div>
                    </div>
                </Section>
                <Section title={t('home.today')}>
                    <div className="px-4 md:px-0 space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 flex justify-between items-center rounded-lg border bg-card">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-40" />
                                </div>
                                <div className="text-right space-y-2">
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>
        );
    }

    const todayKey = getDayOfWeek(currentTime);
    const todaysLessons = lessons.filter(lesson => lesson.day === todayKey).sort((a, b) => a.time.localeCompare(b.time));

    const toMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Support both hyphen and en dash separators and variable spaces
    const parseTimeRange = (range: string): { start: number; end: number } | null => {
        const match = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/.exec(range);
        if (!match) return null;
        return { start: toMinutes(match[1]), end: toMinutes(match[2]) };
    };

    const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    const nextLesson = todaysLessons.find(lesson => {
        const range = parseTimeRange(lesson.time);
        if (!range) return false;
        return range.start > nowInMinutes;
    });

    const isLessonCurrent = (lesson: Lesson): boolean => {
        const range = parseTimeRange(lesson.time);
        if (!range) return false;
        return nowInMinutes >= range.start && nowInMinutes <= range.end;
    };

    type BreakItem = { id: string; kind: 'break'; until: string };

    const withBreakInserted = (): Array<Lesson | BreakItem> => {
        const items: Array<Lesson | BreakItem> = [...todaysLessons];
        const hasCurrent = todaysLessons.some(isLessonCurrent);
        if (hasCurrent || !nextLesson) return items;

        const nextIndex = todaysLessons.findIndex(l => l.id === nextLesson.id);
        const untilTime = nextLesson.time.replace(/\s*[-–].*$/, '');
        const breakItem: BreakItem = { id: `break-${nextLesson.id}`, kind: 'break', until: untilTime };
        if (nextIndex >= 0) {
            items.splice(nextIndex, 0, breakItem);
        }
        return items;
    };
    const displayItems = withBreakInserted();

    const hasNewGrades = grades.some(sg => Array.isArray(sg.grades) && sg.grades.length > 0);
    const unreadMessages = messages.filter(msg => !msg.read);

    return (
        <div className="space-y-8">

            {hasNewGrades && (
                <Section title={t('home.newGrades')}>
                    <div className="px-4 md:px-0">
                        <NewGradesList grades={grades} onGradeClick={(grade) => onOpenSheet(grade)} />
                    </div>
                </Section>
            )}

            {unreadMessages.length > 0 && (
                <Section title={t('messages.unreadMessages')}>
                    <div className="px-4 md:px-0 space-y-3">
                        {unreadMessages.slice(0, 3).map(message => (
                            <Card
                                key={message.id}
                                className="cursor-pointer transition-all hover:bg-card/80 hover:shadow-md border-primary bg-primary/10"
                                onClick={() => onOpenSheet(message)}
                            >
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{message.title}</p>
                                            <p className="text-sm text-muted-foreground truncate">{anonymizeName(message.user)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">{message.date}</p>
                                        <Badge className="text-xs bg-primary text-primary-foreground">{t('common.new')}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </Section>
            )}

            <Section title={getDayName(todayKey)}>
                <div className="px-4 md:px-0 space-y-3">
                    {displayItems.length > 0 ? (
                        displayItems.map(item => {
                            if ((item as any).kind === 'break') {
                                const br = item as BreakItem;
                                return (
                                    <Card key={br.id} className={cn("border-primary bg-primary/10")}>
                                        <CardContent className="p-3 text-sm">
                                            {t('home.breakUntil')} {br.until}
                                        </CardContent>
                                    </Card>
                                );
                            }
                            const lesson = item as Lesson;
                            return (
                                <Card
                                    key={lesson.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:bg-card/80 hover:shadow-md",
                                        isLessonCurrent(lesson) && "border-primary bg-primary/10"
                                    )}
                                    onClick={() => onOpenSheet(lesson)}
                                >
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{lesson.subject}</p>
                                            <p className="text-sm text-muted-foreground">{`${anonymizeName(lesson.teacher)} · ${lesson.room}`}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{lesson.time}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <Card className="bg-card/50">
                            <CardContent className="p-16 text-center text-muted-foreground">
                                <p>{t('home.noLessonsToday')}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </Section>
        </div>
    );
}
