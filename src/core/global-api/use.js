/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 大 Vue 身上有一个 _installedPlugins 属性，记录了所有已安装的插件
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) { // 如果插件已经安装过了，直接返回 大Vue
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1) // arguments[0] 就是插件对象，跳过第0项，从第一项开始转化为真实数组
    args.unshift(this) // 把当前的 大Vue 放到数组最前面
    if (typeof plugin.install === 'function') { // 优先判断该对象身上有没有 install方法
      plugin.install.apply(plugin, args) // 执行插件对象身上的 install方法，把 大Vue 连同 Vue.use(vueRouter, 1, 2, 3) 后面的参数一起传到 install方法
    } else if (typeof plugin === 'function') { // 可能传入的就是一个函数，直接当成 install方法，执行这个函数
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin) // 缓存插件
    return this
  }
}
