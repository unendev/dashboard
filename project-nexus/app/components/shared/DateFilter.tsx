'use client'

import React from 'react';
import { Button } from '@/app/components/ui/button';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ selectedDate, onDateChange }) => {
  const today = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : selectedDate;
  
  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    onDateChange(today);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <Button 
        onClick={goToPreviousDay}
        variant="outline"
        size="sm"
        className="text-gray-300 hover:text-gray-100"
      >
        前一天
      </Button>
      
      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="border border-gray-700/50 bg-gray-800/50 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-gray-300 text-sm">
          {formatDate(selectedDate)}
        </span>
      </div>
      
      <Button 
        onClick={goToNextDay}
        variant="outline"
        size="sm"
        className="text-gray-300 hover:text-gray-100"
      >
        后一天
      </Button>
      
      <Button 
        onClick={goToToday}
        variant="outline"
        size="sm"
        className="text-gray-300 hover:text-gray-100"
      >
        今天
      </Button>
    </div>
  );
};

export default DateFilter;



