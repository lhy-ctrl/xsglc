/*
 * cloud_read.js —— 云端网页模块（公网网页版使用）
 * 只含 publishable key（公开读权限），不含任何写权限密钥。
 * 供同事访问的网页默认只读拉取；管理员登录后可通过数据库函数
 * （verify_admin / admin_write）校验密码后安全写入，密码校验在
 * Supabase 服务端完成，网页不暴露任何 secret key。
 */
(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else global.AppCloud = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONFIG = {
    URL: 'https://gqfwkuyrcnsaxcmchhcn.supabase.co',
    PUBLISHABLE: 'sb_publishable_DQFzwdIa8yenzZ7OJfZB2Q_Qfh0Z3Mk',
    TABLE: 'app_data',
    ROW_ID: 1,
    READONLY: false   // 网页版支持管理员登录写入（走 RPC，不含密钥）
  };

  function rpcUrl(fn) { return CONFIG.URL + '/rest/v1/rpc/' + fn; }

  function authHeaders() {
    return { 'apikey': CONFIG.PUBLISHABLE, 'Authorization': 'Bearer ' + CONFIG.PUBLISHABLE, 'Content-Type': 'application/json' };
  }

  // fetch 带超时（AbortController），避免网络慢时一直"验证中/加载中"无反馈
  function fetchWithTimeout(url, opts, ms) {
    ms = ms || 20000;
    if (typeof AbortController === 'undefined') return fetch(url, opts);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    opts = opts || {};
    opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) {
      clearTimeout(timer);
      return r;
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  // 从云端拉取（publishable key 可读，RLS 允许匿名读）
  function pull() {
    return fetchWithTimeout(CONFIG.URL + '/rest/v1/' + CONFIG.TABLE + '?id=eq.' + CONFIG.ROW_ID, {
      method: 'GET',
      headers: { 'apikey': CONFIG.PUBLISHABLE, 'Authorization': 'Bearer ' + CONFIG.PUBLISHABLE }
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('拉取失败 HTTP ' + r.status + ': ' + t); });
      return r.json();
    }).then(function (rows) { return rows && rows[0] ? rows[0].payload : null; });
  }

  // 管理员密码校验：调用数据库函数 verify_admin（返回 boolean）
  // 不暴露任何密钥，密码只传给服务端函数做 bcrypt 比对
  function verifyAdmin(pwd) {
    return fetchWithTimeout(rpcUrl('verify_admin'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ pwd: pwd })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('验证失败 HTTP ' + r.status + ': ' + t); });
      return r.json(); // true / false
    });
  }

  // 管理员安全写入：调用数据库函数 admin_write(payload, pwd)
  // 函数内部校验密码，正确才写入 app_data（security definer 绕过 RLS 写限制）
  function adminWrite(payload, pwd) {
    return fetchWithTimeout(rpcUrl('admin_write'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ payload: payload, pwd: pwd })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (e) {}
        throw new Error('保存失败：' + msg);
      });
      return true;
    });
  }

  // 通用管理员 RPC 调用（须为主管理员全权限密码；返回 json 或 true）
  function adminRpc(fn, body) {
    return fetchWithTimeout(rpcUrl(fn), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (e) {}
        throw new Error(msg);
      });
      return r.status === 204 ? true : r.json();
    });
  }
  // 二级管理员：列表 / 添加 / 删除（须主管理员密码）
  function listSecondary(pwd) { return adminRpc('admin_list_secondary', { pwd: pwd }); }
  function addSecondary(pwd, name, newPwd) { return adminRpc('admin_add_secondary', { pwd: pwd, name: name, new_pwd: newPwd }); }
  function delSecondary(pwd, id) { return adminRpc('admin_del_secondary', { pwd: pwd, target_id: id }); }

  // 兼容旧接口：push 必须带密码（网页版）；直接调用无密码则拒绝
  function push(payload, pwd) {
    if (!pwd) return Promise.reject(new Error('需要管理员密码才能保存到云端'));
    return adminWrite(payload, pwd);
  }

  return { push: push, pull: pull, verifyAdmin: verifyAdmin, adminWrite: adminWrite, listSecondary: listSecondary, addSecondary: addSecondary, delSecondary: delSecondary, CONFIG: CONFIG };
});
