import { roundNames } from "@/lib/bracket";
import { formatDeadline, formatDuration, type BracketSchedule, type BracketVisibility } from "@/lib/bracket-schedule";
import Icon from "./icon";

export default function BracketScheduleCard({ visibility, schedule, count, shared = false }: { visibility: BracketVisibility; schedule: BracketSchedule; count: number; shared?: boolean }) {
  const names = roundNames(count);
  return <section className="bracket-scheduleCard" aria-label="Visibility and round schedule">
    <div className="bracket-scheduleIntro"><Icon name={visibility === "private" ? "lock" : "globe"} /><div><h2>{visibility === "private" ? "Private bracket" : "Public bracket"} <span>· {schedule.mode === "manual" ? "Manual rounds" : "Scheduled rounds"}</span></h2><p>{schedule.mode === "manual" ? "Play solo or bring your rivals. End each round when you’re ready." : visibility === "public" ? "The schedule is locked. Rounds can’t be ended early, edited, or reset." : "Your rounds have set deadlines. There’s no manual end-round control."}</p></div></div>
    {schedule.mode !== "manual" && <details><summary>View all {names.length} round {schedule.roundMinutes ? "durations" : "deadlines"} <Icon name="chevron" /></summary><ol>{schedule.roundEndsAt.map((end, index) => <li key={end}><strong>{names[index]}</strong>{!schedule.roundMinutes && <time dateTime={end}>{formatDeadline(end)}</time>}<span>{formatDuration(schedule.roundMinutes ? schedule.roundMinutes[index] * 60_000 : Date.parse(end) - Date.parse(index ? schedule.roundEndsAt[index - 1] : schedule.startsAt))}</span></li>)}</ol><p className="bracket-scheduleTimezone">{schedule.roundMinutes ? "Each round gets its full duration when it opens. One day is 24 hours." : `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`}</p></details>}
    {!shared && <p className="bracket-schedulePreviewNote">{schedule.mode === "manual" ? "Invite links will be available when publishing is ready." : "Timing preview · your schedule is saved. Automatic round results and sharing will be available when publishing is ready."}</p>}
  </section>;
}
