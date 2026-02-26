import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface CustomDatePickerProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CustomDatePicker({ value, onChange, placeholder = "Pilih Tanggal..." }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'days' | 'months' | 'years'>('days');

    // currentDate determines what calendar page we are viewing
    const [currentDate, setCurrentDate] = useState(value ? dayjs(value) : dayjs());
    const [yearPage, setYearPage] = useState(Math.floor(currentDate.year() / 12) * 12);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            setCurrentDate(dayjs(value));
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpen = () => {
        const d = value ? dayjs(value) : dayjs();
        setCurrentDate(d);
        setYearPage(Math.floor(d.year() / 12) * 12);
        setView('days');
        setIsOpen(true);
    };

    const handleSelectDay = (day: number) => {
        const newDate = currentDate.date(day);
        onChange(newDate.format('YYYY-MM-DD'));
        setIsOpen(false);
    };

    const handleSelectMonth = (monthIndex: number) => {
        setCurrentDate(currentDate.month(monthIndex));
        setView('days');
    };

    const handleSelectYear = (year: number) => {
        setCurrentDate(currentDate.year(year));
        setView('months');
    };

    const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));

    const nextYearPage = () => setYearPage(yearPage + 12);
    const prevYearPage = () => setYearPage(yearPage - 12);

    // Days grid calculation
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfMonth = currentDate.startOf('month').day();
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const displayValue = value ? dayjs(value).format('DD MMM YYYY') : '';

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={handleOpen}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 bg-white cursor-pointer flex items-center justify-between"
            >
                <span className={displayValue ? 'text-slate-900' : 'text-slate-400'}>
                    {displayValue || placeholder}
                </span>
                <CalendarIcon className="text-slate-400" size={18} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={view === 'years' ? prevYearPage : view === 'months' ? () => setCurrentDate(currentDate.subtract(1, 'year')) : prevMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="font-semibold text-slate-800 flex items-center gap-1 cursor-pointer">
                            {view === 'days' && (
                                <>
                                    <span onClick={() => setView('months')} className="hover:text-blue-600 px-1 py-0.5 rounded transition-colors">{MONTHS[currentDate.month()]}</span>
                                    <span onClick={() => { setView('years'); setYearPage(Math.floor(currentDate.year() / 12) * 12); }} className="hover:text-blue-600 px-1 py-0.5 rounded transition-colors">{currentDate.year()}</span>
                                </>
                            )}
                            {view === 'months' && (
                                <span onClick={() => { setView('years'); setYearPage(Math.floor(currentDate.year() / 12) * 12); }} className="hover:text-blue-600 px-1 py-0.5 rounded transition-colors flex items-center gap-1">
                                    {currentDate.year()} <ChevronDown size={14} />
                                </span>
                            )}
                            {view === 'years' && (
                                <span>{yearPage} - {yearPage + 11}</span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={view === 'years' ? nextYearPage : view === 'months' ? () => setCurrentDate(currentDate.add(1, 'year')) : nextMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    {view === 'days' && (
                        <div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DAYS.map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-slate-400">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {blanks.map(b => <div key={`blank-${b}`} />)}
                                {days.map(d => {
                                    const isSelected = value && dayjs(value).date() === d && dayjs(value).month() === currentDate.month() && dayjs(value).year() === currentDate.year();
                                    const isToday = dayjs().date() === d && dayjs().month() === currentDate.month() && dayjs().year() === currentDate.year();

                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => handleSelectDay(d)}
                                            className={`
                                                aspect-square flex items-center justify-center text-sm rounded-full transition-colors
                                                ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200' : ''}
                                                ${!isSelected && isToday ? 'bg-blue-50 text-blue-600 font-bold' : ''}
                                                ${!isSelected && !isToday ? 'hover:bg-slate-100 text-slate-700' : ''}
                                            `}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {view === 'months' && (
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((m, idx) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleSelectMonth(idx)}
                                    className={`py-2 text-sm rounded-lg transition-colors ${currentDate.month() === idx ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    {m.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'years' && (
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                                <button
                                    key={y}
                                    type="button"
                                    onClick={() => handleSelectYear(y)}
                                    className={`py-2 text-sm rounded-lg transition-colors ${currentDate.year() === y ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
