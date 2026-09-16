const Theme = (function(){
  const KEY = 'ir_theme';

  function apply(mode){
    const isLight = mode === 'light';
    document.documentElement.classList.toggle('theme-light', isLight);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerText = isLight ? '🌙 Dark' : '☀ Light';
    try { localStorage.setItem(KEY, mode); } catch(e){}
  }
  function toggle(){
    const isLight = document.documentElement.classList.contains('theme-light');
    apply(isLight ? 'dark' : 'light');
  }
  function init(){
    apply(document.documentElement.classList.contains('theme-light') ? 'light' : 'dark');
  }
  return { apply, toggle, init };
})();