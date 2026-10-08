"use client";

import { useState } from "react";

export function useSchedule() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [pubTime, setPubTime] = useState("18:00");
  const [intervalDays, setIntervalDays] = useState(1);

  return { startDate, pubTime, intervalDays, setStartDate, setPubTime, setIntervalDays };
}