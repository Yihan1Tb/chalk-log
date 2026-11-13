import type { Grade, GradeSystem } from './types'

export const V_GRADES = ['VB', ...Array.from({ length: 18 }, (_, i) => `V${i}`)]
export const YDS_GRADES = [
  '5.5', '5.6', '5.7', '5.8', '5.9',
  ...Array.from({ length: 6 }, (_, i) => ['a', 'b', 'c', 'd'].map(letter => `5.${i + 10}${letter}`)).flat(),
]
// 法式与 YDS 仅用于大致对照，岩馆定级与路线风格会影响实际体感。
export const FRENCH_TO_YDS: Record<string, string> = {
  '3': '5.5', '4a': '5.5', '4b': '5.6', '4c': '5.7', '5a': '5.8', '5b': '5.9',
  '5c': '5.10a', '6a': '5.10b', '6a+': '5.10c', '6b': '5.10d', '6b+': '5.11a',
  '6c': '5.11b', '6c+': '5.11c', '7a': '5.11d', '7a+': '5.12a', '7b': '5.12b',
  '7b+': '5.12c', '7c': '5.12d', '7c+': '5.13a', '8a': '5.13b', '8a+': '5.13c',
  '8b': '5.13d', '8b+': '5.14a', '8c': '5.14b', '8c+': '5.14c', '9a': '5.14d',
  '9a+': '5.15a', '9b': '5.15b', '9b+': '5.15c', '9c': '5.15d',
}
export const FRENCH_GRADES = Object.keys(FRENCH_TO_YDS)
export const GRADE_OPTIONS: Record<GradeSystem, string[]> = { v: V_GRADES, yds: YDS_GRADES, french: FRENCH_GRADES }
export function isValidGrade(grade: Grade): boolean {
  const options = GRADE_OPTIONS[grade.system]
  return Array.isArray(options) && options.includes(grade.value)
}
export function gradeRank(grade: Grade): number {
  if (grade.system === 'v') return V_GRADES.indexOf(grade.value)
  return YDS_GRADES.indexOf(grade.system === 'french' ? FRENCH_TO_YDS[grade.value] : grade.value)
}
export function compareGrades(a: Grade, b: Grade): number {
  if ((a.system === 'v') !== (b.system === 'v')) throw new Error('抱石与绳索难度不能直接比较')
  return gradeRank(a) - gradeRank(b)
}
export function toYds(grade: Grade): string { return grade.system === 'french' ? FRENCH_TO_YDS[grade.value] : grade.value }
export function gradeLabel(grade: Grade): string { return grade.system === 'french' ? `${grade.value} 法式` : grade.value }
