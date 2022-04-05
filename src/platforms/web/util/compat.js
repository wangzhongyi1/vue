/* @flow */

import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
//todo 检查浏览器是否把标签上的属性给编码掉了
function shouldDecode (content: string, encoded: string): boolean {
  const div = document.createElement('div')
  div.innerHTML = `<div a="${content}"/>`
  return div.innerHTML.indexOf(encoded) > 0
}

// #3663
// IE encodes newlines inside attribute values while other browsers don't
//todo 比如：<span title="123/n456"></span>，在 IE浏览器中会把 \n 进行解析成一个回车，而其他浏览器不会
export const shouldDecodeNewlines = inBrowser ? shouldDecode('\n', '&#10;') : false
