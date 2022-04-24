/* @flow */

import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import type { ISet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: ISet;
  newDepIds: ISet;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ) {
    this.vm = vm
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep //? 深度监听 -> 用户watcher
      this.user = !!options.user //? 标识是否是 -> 用户watcher
      this.lazy = !!options.lazy //? 是否懒计算 -> 计算属性watcher
      this.sync = !!options.sync //? 是否同步(每次更新属性就调用) -> 用户watcher
    } else {
      this.deep = this.user = this.lazy = this.sync = false //? 没有传 options，默认全部false，即最普通的watcher
    }
    this.cb = cb
    this.id = ++uid // uid for batching 每个watcher的唯一标识
    this.active = true //? 标识这个 watcher 是否活跃，不活跃会被干掉
    this.dirty = this.lazy // for lazy watchers
    this.deps = [] //? 存放了和这个watcher 关联的 dep
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn) //? 用户watcher 解析路径 { 'a.b.c': { handler: fn, deep: true, immediate: true }} 解析取到最终的 c 值
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm) //? 调用 vm._update(vm._render()) 进行页面渲染更新
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   *? 新增的属性添加到 newDepIds 和 newDeps 身上，但是为啥没有给 depIds和deps 添加?
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this) //? 让 dep 把当前watcher保存起来
      }
    }
  }

  /**
   * Clean up for dependency collection.
   *? 将新老数据交换，清除老数据
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) { //? 新的 newDepIds 里没有老的里面的 dep.id，说明这个dep，需要删除
        dep.removeSub(this) //? 调用 dep 的 removeSub方法，让 dep 从 subs数组中把自己移除
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    //? 上面三句 交换 depIds和newDepIds
    this.newDepIds.clear() //? 现在 newDepIds 里面是老的，清除老的

    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    //? 上面三句 交换 deps和newDeps
    this.newDeps.length = 0 //? 现在 newDeps 里面是老的，清除老的
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) { //? 计算属性watcher
      this.dirty = true
    } else if (this.sync) { //? 用户写的同步watcher，调用 this.run() -> this.get() -> this.getter() 也就是 vm.update(vm.render()) 进行组件更新
      this.run()
    } else {
      queueWatcher(this) //? 进入队列，等待更新
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   *? 当前watcher后续进行更新操作，才会调用这个方法，重新执行 vm._update(vm._render())
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue) //? 用户watcher 传入的handler处理函数调用，并传入 newVal, oldVal
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get() //? 计算属性的 get 取值函数调用
    this.dirty = false //? 计算属性watcher 依赖的 响应式属性的值改变时才会把 this.dirty 重新置为 true，从而触发计算属性更新
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend() //? 调用每个 dep 的 depend方法
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   *? 调用watcher这个方法，在当前 vm实例 身上的 _watchers数组中，将当前watcher移除，并且通知所有和这个watcher关联的dep，在subs数组中删除自己
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this) //? 把
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
const seenObjects = new Set()
function traverse (val: any) {
  seenObjects.clear()
  _traverse(val, seenObjects)
}

function _traverse (val: any, seen: ISet) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || !Object.isExtensible(val)) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
