export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function semLabel(sem) {
  return `${ordinal(sem)} Semester`
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function shortDate(value) {
  const d = parseDate(value)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : ''
}
