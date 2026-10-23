import { useState, useMemo, useCallback } from 'react';
import { CALENDAR, buildCalendarioForMatchday, DEFAULT_MATCHDAY_NUM } from '../data/calendar';
import type { Calendario } from '../types';

export function useMatchday() {
  const [matchdayNum, setMatchdayNum] = useState(DEFAULT_MATCHDAY_NUM);

  const calendario: Calendario = useMemo(
    () => {
      const md = CALENDAR.find((m) => m.num === matchdayNum);
      return md ? buildCalendarioForMatchday(md) : {};
    },
    [matchdayNum],
  );

  const matchday = useMemo(
    () => CALENDAR.find((m) => m.num === matchdayNum),
    [matchdayNum],
  );

  const changeMatchday = useCallback((num: number) => {
    setMatchdayNum(num);
  }, []);

  return { matchdayNum, matchday, calendario, changeMatchday };
}
