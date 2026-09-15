import { $ } from '../core/dom-helpers.js';
import { escapeHtml } from '../../../../shared/js/dom-utils.js';

export const STORAGE_KEY = 'terminal_todos';
let todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  renderTodos();
}

/** Adds the text currently in #todoInput as a new pending item. */
export function addTodo() {
  const input = $('todoInput');
  const text = input.value.trim();
  if (!text) return;
  todos.push({ text, completed: false });
  input.value = '';
  persist();
}

export function toggleTodo(index) {
  todos[index].completed = !todos[index].completed;
  persist();
}

export function deleteTodo(index, event) {
  event.stopPropagation();
  todos.splice(index, 1);
  persist();
}

/** Rebuilds the #todoList <ul> from the in-memory list. */
export function renderTodos() {
  const list = $('todoList');
  list.innerHTML = '';

  if (!todos.length) {
    list.innerHTML = '<li style="color:#444;text-align:center;font-size:.72em;padding:2px">Nessun promemoria</li>';
    $('todoSummary').innerText = '';
    return;
  }

  todos.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.innerHTML = '<div class="todo-item-left"><input type="checkbox" ' + (t.completed ? 'checked' : '') +
      '><span class="' + (t.completed ? 'completed' : '') + '">' + escapeHtml(t.text) +
      '</span></div><button class="todo-del">×</button>';
    li.querySelector('input').onclick = e => { e.stopPropagation(); toggleTodo(i); };
    li.querySelector('span').onclick = () => toggleTodo(i);
    li.querySelector('.todo-del').onclick = e => deleteTodo(i, e);
    list.appendChild(li);
  });

  $('todoSummary').innerText = todos.filter(x => x.completed).length + ' / ' + todos.length + ' completate';
}
