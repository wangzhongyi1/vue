/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods) //返回['push','pop','shift','unshift','splice','sort','reverse']

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep() // 每一层身上都有一个 dep,而且每一层的每个属性身上也都有一个 dep
    this.vmCount = 0
    def(value, '__ob__', this) // 定义不可枚举的 __ob__ 属性
    if (Array.isArray(value)) { //? 数组调用 observeArray 循环每一项，调用 observe 来观测
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   *? 使用 Object.keys(obj) 循环对象，调用 defineReactive 添加 getter/setter
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   *? 循环数组中的每一项，调用 observe(item) 进行劫持
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *? 没有 __proto__ 的环境下，直接将数组的 __proto__ 指向自己写的7种方法对象
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *? 将数组的 7种方法调用自己重写的
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *? 调用 new Observer(value) 将传入的 value 转化为响应式数据，返回值：Observer实例 | undefined
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) { // 如果不是对象直接结束执行
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) { // 如果传进来的对象已经是一个响应式对象了，取出 __ob__ 并返回
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep() // 每一个属性身上都有一个 dep

  const property = Object.getOwnPropertyDescriptor(obj, key) //拿出该对象的属性的属性描述符
  if (property && property.configurable === false) { //如果是不可配置的属性，直接 return 结束函数执行
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  let childOb = !shallow && observe(val) // shallow 是否浅层监控，默认深层监控(递归)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend() // 在渲染取值的时候收集依赖
        if (childOb) {
          childOb.dep.depend() // 如果该属性的属性值是对象，也让属性值 触发自己的依赖收集(因为每一层都有一个 dep)
          if (Array.isArray(value)) { // 如果是数组，就循环每一项进行依赖收集
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal) // 为了解决赋的值是对象的情况，需要再次调用 observe(newVal) 将新添加的对象进行劫持
      dep.notify() // 通知 该 dep 身上的每一个watcher 进行更新
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 *? 经过一系列的判断，target是响应式对象，就添加key的响应式属性，不是就直接新增属性
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) { // 如果传入的 target 是个数组，key 是数组下标，就添加这一项
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (hasOwn(target, key)) { // 如果 target身上有这个属性，直接赋值并返回
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__ // 查看 target身上有没有 __ob__属性，也就是检查是否响应式对象
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) { // 如果 taget不是响应式对象，就直接赋值并返回
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val) // 走到这里，说明 target是个响应式对象而且需要新增属性，所以调用defineReactive添加响应式属性
  ob.dep.notify() // 通知 dep 收集依赖，并更新界面
  return val
}

/**
 * Delete a property and trigger change if necessary.
 *? 调用 this.$del() 或 Vue.del() 删除一个响应式属性，并引发更新
 */
export function del (target: Array<any> | Object, key: any) {
  if (Array.isArray(target) && isValidArrayIndex(key)) { // 删除数组中的指定item
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key] // 删除指定的属性
  if (!ob) {
    return
  }
  ob.dep.notify() // 调用 dep 的 notify方法 通知当前 dep中存放的所有watcher 进行更新
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 *? 循环数组中的每一项，进行依赖收集, 多维数组递归收集依赖
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) { //多维数组，递归收集依赖
      dependArray(e)
    }
  }
}
