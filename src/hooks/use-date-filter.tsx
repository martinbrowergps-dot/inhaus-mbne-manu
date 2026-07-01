import React, { createContext, useContext, useState, useTransition } from "react";
import { parseBRDate, getWeekStart } from "@/lib/format";

interface DateFilterContextType {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  clearFilter: () => void;
  setPreset: (preset: "today" | "week" | "month") => void;
  isActive: boolean;
  filterByDateRange: (dateValue: string | Date | null | undefined) => boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [, startTransition] = useTransition();

  const handleSetStartDate = (date: string) => {
    startTransition(() => {
      setStartDate(date);
    });
  };

  const handleSetEndDate = (date: string) => {
    startTransition(() => {
      setEndDate(date);
    });
  };

  const clearFilter = () => {
    startTransition(() => {
      setStartDate("");
      setEndDate("");
    });
  };

  const setPreset = (preset: "today" | "week" | "month") => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);

    if (preset === "today") {
      // already set to today
    } else if (preset === "week") {
      start = getWeekStart(today);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (preset === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const fmtISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    startTransition(() => {
      setStartDate(fmtISO(start));
      setEndDate(fmtISO(end));
    });
  };

  const isActive = !!startDate || !!endDate;

  const filterByDateRange = (dateValue: string | Date | null | undefined): boolean => {
    if (!isActive) return true;
    if (!dateValue) return false;

    let targetDate: Date | null = null;
    if (dateValue instanceof Date) {
      targetDate = dateValue;
    } else {
      targetDate = parseBRDate(String(dateValue));
    }

    if (!targetDate) return false;

    // Reset target time to compare just dates
    const checkTime = new Date(targetDate);
    checkTime.setHours(0, 0, 0, 0);

    if (startDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const start = new Date(sy, sm - 1, sd);
      start.setHours(0, 0, 0, 0);
      if (checkTime < start) return false;
    }

    if (endDate) {
      const [ey, em, ed] = endDate.split("-").map(Number);
      const end = new Date(ey, em - 1, ed);
      end.setHours(0, 0, 0, 0);
      if (checkTime > end) return false;
    }

    return true;
  };

  return (
    <DateFilterContext.Provider
      value={{
        startDate,
        endDate,
        setStartDate: handleSetStartDate,
        setEndDate: handleSetEndDate,
        clearFilter,
        setPreset,
        isActive,
        filterByDateRange,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateFilterProvider");
  }
  return context;
}
