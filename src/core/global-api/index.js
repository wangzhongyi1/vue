/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from '../../shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef) //? 定义 Vue全局配置API 如：Vue.config.silent = true

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = { //? Vue 内置一些未公开的工具函数，只有懂这部分源码的人才知道
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set //? 定义 Vue.set, this.$set 动态添加响应式属性
  Vue.delete = del //? 定义 Vue.delete, this.$delete 动态删除响应式属性，并触发更新
  Vue.nextTick = nextTick //? 定义 Vue.nextTick, this.$nextTick 在页面更新后立即获取真实dom

  Vue.options = Object.create(null) //? Vue.options = {}
  ASSET_TYPES.forEach(type => { //? Vue.options = { components: {}, directives: {}, filters: {} }
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue  //? Vue.options._base 指向 大Vue

  extend(Vue.options.components, builtInComponents) //? 注册 keep-alive 抽象组件(需要认真看一下)

  initUse(Vue) //? 定义 Vue.use 用于插件注册
  initMixin(Vue) //? 定义 Vue.mixin 全局混入
  initExtend(Vue) //? 定义 Vue.extend 用于创建一个 vueComponent,也可说是创建一个子类，因为每一个vueComponet就是Vue子类
  initAssetRegisters(Vue) //? 定义 Vue.component,Vue.directive,Vue.filter 三个全局方法用于定义全局组件，全局指令，全局过滤器
}
