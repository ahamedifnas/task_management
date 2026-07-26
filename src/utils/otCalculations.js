import { getDaysInMonth } from 'date-fns'

export function calcOTAmount(basicSalary, stdHoursPerDay, multiplier, overtimeMinutes, yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const dailyRate = basicSalary / daysInMonth
  const hourlyRate = dailyRate / stdHoursPerDay
  const otHourly = hourlyRate * multiplier
  const overtimeHours = overtimeMinutes / 60
  return Math.round(otHourly * overtimeHours * 100) / 100
}

export function calcOvertimeMinutes(
  totalWorkMinutes,
  stdHoursPerDay = 8,
  roundingRule = 'none'
) {
  const totalMinutes = Number(totalWorkMinutes) || 0
  const standardMinutes = (Number(stdHoursPerDay) || 8) * 60
  const overtimeMinutes = Math.max(0, totalMinutes - standardMinutes)

  if (roundingRule === 'nearest_15') return Math.round(overtimeMinutes / 15) * 15
  if (roundingRule === 'nearest_30') return Math.round(overtimeMinutes / 30) * 30
  if (roundingRule === 'floor_hour') return Math.floor(overtimeMinutes / 60) * 60
  return overtimeMinutes
}

export function minutesToHHMM(minutes) {
  if (!minutes || minutes <= 0) return '0h 0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export function calcDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin <= startMin) return 0
  return endMin - startMin
}

export function hasOverlap(tasks, newStart, newEnd, excludeIndex = -1) {
  const [ns, nm] = newStart.split(':').map(Number)
  const [ne, nem] = newEnd.split(':').map(Number)
  const newStartMin = ns * 60 + nm
  const newEndMin = ne * 60 + nem

  return tasks.some((task, i) => {
    if (i === excludeIndex) return false
    const [ts, tm] = task.startTime.split(':').map(Number)
    const [te, tem] = task.endTime.split(':').map(Number)
    const taskStartMin = ts * 60 + tm
    const taskEndMin = te * 60 + tem
    return newStartMin < taskEndMin && newEndMin > taskStartMin
  })
}
