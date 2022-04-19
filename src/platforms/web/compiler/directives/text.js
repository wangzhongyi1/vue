/* @flow */

import { addProp } from 'compiler/helpers'

/**
 *? 初始化 v-text 指令
 * @param {ASTElement} el 
 * @param {ASTDirective} dir 
 */
export default function text (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'textContent', `_s(${dir.value})`)
  }
}
