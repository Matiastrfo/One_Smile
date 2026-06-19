from persistence.database import get_connection
from domain.schedule_config import DaySchedule, ScheduleConfig, DAYS

class ScheduleConfigRepository:
    def get_by_professional(self, professional_id: int) -> ScheduleConfig:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT day_of_week, enabled, start_time, end_time, slot_duration FROM schedule_config WHERE professional_id = ?",
            (professional_id,)
        )
        rows = cursor.fetchall()
        conn.close()

        existing = {r[0]: DaySchedule(day_of_week=r[0], enabled=bool(r[1]), start_time=r[2], end_time=r[3], slot_duration=r[4]) for r in rows}
        days = [existing.get(d, DaySchedule(day_of_week=d)) for d in DAYS]
        return ScheduleConfig(professional_id=professional_id, days=days)

    def save(self, professional_id: int, config: ScheduleConfig) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        for day in config.days:
            cursor.execute(
                """INSERT INTO schedule_config (professional_id, day_of_week, enabled, start_time, end_time, slot_duration)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(professional_id, day_of_week)
                   DO UPDATE SET enabled=excluded.enabled, start_time=excluded.start_time,
                                 end_time=excluded.end_time, slot_duration=excluded.slot_duration""",
                (professional_id, day.day_of_week, int(day.enabled), day.start_time, day.end_time, day.slot_duration)
            )
        conn.commit()
        conn.close()
