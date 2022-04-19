/* @flow */

//? 导出一个被冻结的空对象
export const emptyObject = Object.freeze({})

/**
 * Check if a string starts with $ or _
 *? 检查传入的字符串是否以 $ 或者 _ 开头
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 *? 定义不可枚举的属性
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 *? 目前只看到 watch:{} 取值调用了这里，去 vm实例上取相应的值
 */
const bailRE = /[^\w.$]/
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
