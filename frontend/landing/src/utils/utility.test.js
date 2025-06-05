import { describe, it, expect } from 'vitest'
import { validateFormData } from './utility'

describe('validateFormData', () => {
  it('returns error for missing fields', () => {
    expect(validateFormData({institution:'',contactPerson:'',email:'',institutionType:''})).toBe('Пожалуйста, введите название учреждения')
    expect(validateFormData({institution:'Inst',contactPerson:'',email:'',institutionType:''})).toBe('Пожалуйста, введите имя контактного лица')
    expect(validateFormData({institution:'Inst',contactPerson:'John',email:'',institutionType:''})).toBe('Пожалуйста, введите электронную почту')
    expect(validateFormData({institution:'Inst',contactPerson:'John',email:'bad',institutionType:''})).toBe('Пожалуйста, введите корректный адрес электронной почты')
    expect(validateFormData({institution:'Inst',contactPerson:'John',email:'a@b.c',institutionType:''})).toBe('Пожалуйста, выберите тип учебного заведения')
  })

  it('returns null for valid data', () => {
    const data = {institution:'Inst',contactPerson:'John',email:'john@example.com',institutionType:'uni'}
    expect(validateFormData(data)).toBe(null)
  })
})
