import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  X,
  Save
} from 'lucide-react';

// Utility functions for date handling
const dateUtils = {
  format: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },
  
  isSameDay: (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },
  
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  addWeeks: (date, weeks) => {
    return dateUtils.addDays(date, weeks * 7);
  },
  
  addMonths: (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },
  
  startOfMonth: (date) => {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  },
  
  endOfMonth: (date) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    result.setHours(23, 59, 59, 999);
    return result;
  },
  
  getDaysInMonth: (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  },
  
  getFirstDayOfWeek: (date) => {
    const firstDay = dateUtils.startOfMonth(date);
    return firstDay.getDay();
  }
};

// Event colors
const EVENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

// Recurrence options
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
];

// Storage utility
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
};

// Generate recurring events
const generateRecurringEvents = (event, endDate = null) => {
  if (event.recurrence === 'none') return [event];
  
  const events = [event];
  const maxRecurrences = 100; // Prevent infinite loops
  const end = endDate || dateUtils.addMonths(new Date(event.date), 12);
  let currentDate = new Date(event.date);
  let count = 0;
  
  while (count < maxRecurrences) {
    let nextDate;
    
    switch (event.recurrence) {
      case 'daily':
        nextDate = dateUtils.addDays(currentDate, 1);
        break;
      case 'weekly':
        nextDate = dateUtils.addWeeks(currentDate, 1);
        break;
      case 'monthly':
        nextDate = dateUtils.addMonths(currentDate, 1);
        break;
      case 'custom':
        nextDate = dateUtils.addDays(currentDate, event.customInterval || 1);
        break;
      default:
        return events;
    }
    
    if (nextDate > end) break;
    
    const recurringEvent = {
      ...event,
      id: `${event.id}-${count + 1}`,
      date: dateUtils.format(nextDate, 'YYYY-MM-DD'),
      isRecurring: true,
      parentId: event.id
    };
    
    events.push(recurringEvent);
    currentDate = nextDate;
    count++;
  }
  
  return events;
};

// Event Form Component
const EventForm = ({ event, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: dateUtils.format(new Date(), 'YYYY-MM-DD'),
    time: '09:00',
    description: '',
    color: 'blue',
    recurrence: 'none',
    customInterval: 1,
    ...event
  });
  
  const [errors, setErrors] = useState({});
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const eventData = {
      ...formData,
      id: event?.id || `event-${Date.now()}`,
      datetime: `${formData.date}T${formData.time}`,
      createdAt: event?.createdAt || new Date().toISOString()
    };
    
    onSave(eventData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {event ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter event title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter event description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-gray-400' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat
              </label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData(prev => ({ ...prev, recurrence: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RECURRENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {formData.recurrence === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat every (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.customInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, customInterval: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Save Event
              </button>
              
              {event && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Event Component
const Event = ({ event, onEdit, onDelete, isDragging, onDragStart, onDragEnd }) => {
  const colorClass = EVENT_COLORS.find(c => c.value === event.color)?.class || 'bg-blue-500';
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', event.id);
    onDragStart(event);
  };
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`${colorClass} text-white text-xs p-1 rounded cursor-pointer mb-1 transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:opacity-80`}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(event);
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="flex items-center gap-1 text-white/80">
        <Clock size={10} />
        <span>{event.time}</span>
        {event.isRecurring && <span>↻</span>}
      </div>
    </div>
  );
};

// Calendar Day Component
const CalendarDay = ({ 
  day, 
  isCurrentMonth, 
  isToday, 
  isSelected, 
  events, 
  onClick, 
  onDrop, 
  onDragOver, 
  onEditEvent, 
  onDeleteEvent,
  draggedEvent,
  onDragStart,
  onDragEnd
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const eventId = e.dataTransfer.getData('text/plain');
    onDrop(eventId, day);
  };
  
  return (
    <div
      className={`min-h-24 p-1 border border-gray-200 cursor-pointer transition-colors ${
        !isCurrentMonth ? 'bg-gray-50 text-gray-400' :
        isToday ? 'bg-blue-50 border-blue-300' :
        isSelected ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'
      } ${isDragOver ? 'bg-blue-100 border-blue-400' : ''}`}
      onClick={() => onClick(day)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
        {day.getDate()}
      </div>
      
      <div className="space-y-1">
        {events.slice(0, 3).map(event => (
          <Event
            key={event.id}
            event={event}
            onEdit={onEditEvent}
            onDelete={onDeleteEvent}
            isDragging={draggedEvent?.id === event.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {events.length > 3 && (
          <div className="text-xs text-gray-500">
            +{events.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
};

// Main Calendar Component
const EventCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  
  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = storage.get('calendar-events') || [];
    setEvents(savedEvents);
  }, []);
  
  // Save events to localStorage whenever events change
  useEffect(() => {
    storage.set('calendar-events', events);
  }, [events]);
  
  // Generate all events including recurring ones
  const allEvents = useMemo(() => {
    const generated = [];
    const endDate = dateUtils.addMonths(currentDate, 6);
    
    events.forEach(event => {
      if (!event.isRecurring) {
        const recurringEvents = generateRecurringEvents(event, endDate);
        generated.push(...recurringEvents);
      }
    });
    
    return generated;
  }, [events, currentDate]);
  
  // Filter and search events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesColor = colorFilter === 'all' || event.color === colorFilter;
      return matchesSearch && matchesColor;
    });
  }, [allEvents, searchQuery, colorFilter]);
  
  // Check for conflicts
  useEffect(() => {
    const checkConflicts = () => {
      const conflictingEvents = [];
      const eventsByDate = {};
      
      filteredEvents.forEach(event => {
        const dateKey = event.date;
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      });
      
      Object.entries(eventsByDate).forEach(([date, dayEvents]) => {
        for (let i = 0; i < dayEvents.length; i++) {
          for (let j = i + 1; j < dayEvents.length; j++) {
            const event1 = dayEvents[i];
            const event2 = dayEvents[j];
            
            if (event1.time === event2.time) {
              conflictingEvents.push(event1.id, event2.id);
            }
          }
        }
      });
      
      setConflicts([...new Set(conflictingEvents)]);
    };
    
    checkConflicts();
  }, [filteredEvents]);
  
  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prev => dateUtils.addMonths(prev, -1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(prev => dateUtils.addMonths(prev, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Event management
  const handleSaveEvent = useCallback((eventData) => {
    setEvents(prev => {
      const existing = prev.find(e => e.id === eventData.id);
      if (existing) {
        return prev.map(e => e.id === eventData.id ? eventData : e);
      } else {
        return [...prev, eventData];
      }
    });
    
    setShowEventForm(false);
    setEditingEvent(null);
  }, []);
  
  const handleDeleteEvent = useCallback((eventId) => {
    setEvents(prev => {
      const event = prev.find(e => e.id === eventId);
      if (event && event.parentId) {
        // Delete all recurring instances
        return prev.filter(e => e.id !== event.parentId && e.parentId !== event.parentId);
      } else {
        // Delete single event or main recurring event
        return prev.filter(e => e.id !== eventId && e.parentId !== eventId);
      }
    });
    
    setShowEventForm(false);
    setEditingEvent(null);
  }, []);
  
  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  }, []);
  
  // Drag and drop
  const handleDragStart = useCallback((event) => {
    setDraggedEvent(event);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
  }, []);
  
  const handleDrop = useCallback((eventId, newDate) => {
    if (!draggedEvent) return;
    
    const newDateString = dateUtils.format(newDate, 'YYYY-MM-DD');
    
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          date: newDateString,
          datetime: `${newDateString}T${event.time}`
        };
      }
      return event;
    }));
  }, [draggedEvent]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const startOfMonth = dateUtils.startOfMonth(currentDate);
    const endOfMonth = dateUtils.endOfMonth(currentDate);
    const startOfWeek = dateUtils.addDays(startOfMonth, -startOfMonth.getDay());
    const endOfWeek = dateUtils.addDays(endOfMonth, 6 - endOfMonth.getDay());
    
    const days = [];
    let day = startOfWeek;
    
    while (day <= endOfWeek) {
      days.push(new Date(day));
      day = dateUtils.addDays(day, 1);
    }
    
    return days;
  }, [currentDate]);
  
  // Get events for a specific day
  const getEventsForDay = useCallback((day) => {
    const dayString = dateUtils.format(day, 'YYYY-MM-DD');
    return filteredEvents.filter(event => event.date === dayString);
  }, [filteredEvents]);
  
  const today = new Date();
  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Event Calendar
          </h1>
          <button
            onClick={() => setShowEventForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Colors</option>
              {EVENT_COLORS.map(color => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold min-w-48 text-center">
              {monthYear}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>
      
      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
          <AlertTriangle className="text-yellow-600" size={16} />
          <span className="text-yellow-800 text-sm">
            {conflicts.length} event{conflicts.length > 1 ? 's have' : ' has'} time conflicts
          </span>
        </div>
      )}
      
      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = dateUtils.isSameDay(day, today);
            const isSelected = selectedDate && dateUtils.isSameDay(day, selectedDate);
            const dayEvents = getEventsForDay(day);
            
            return (
              <CalendarDay
                key={index}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                isSelected={isSelected}
                events={dayEvents}
                onClick={(day) => {
                  setSelectedDate(day);
                  setEditingEvent({ date: dateUtils.format(day, 'YYYY-MM-DD') });
                  setShowEventForm(true);
                }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                draggedEvent={draggedEvent}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      </div>
      
      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          onSave={handleSaveEvent}
          onCancel={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default EventCalendar;