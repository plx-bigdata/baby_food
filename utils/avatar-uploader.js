// utils/avatar-uploader.js — 头像选择 → 压缩 → 上传云存储
// chooseMedia 拿到的 tempFilePath 跨设备无效,必须 uploadFile 拿 fileID 才能给家人共享。

/**
 * 选图 + 压缩 + 上传,返回云存储 fileID
 * @returns {Promise<string|null>} 成功返回 cloud:// fileID;用户取消或失败返回 null
 */
async function chooseAndUploadAvatar() {
  let tempFilePath;
  try {
    const choose = await new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      });
    });
    tempFilePath = choose.tempFiles[0].tempFilePath;
  } catch (_) {
    return null;
  }

  let uploadPath = tempFilePath;
  try {
    const compressed = await new Promise((resolve, reject) => {
      wx.compressImage({ src: tempFilePath, quality: 60, success: resolve, fail: reject });
    });
    uploadPath = compressed.tempFilePath;
  } catch (e) {
    console.warn('[avatar] compressImage 失败,改用原图', e);
  }

  wx.showLoading({ title: '上传中', mask: true });
  try {
    const app = getApp();
    if (!wx.cloud) throw new Error('wx.cloud 未注入');
    const openid = (app && app.globalData && app.globalData.openid)
      || `anon_${Math.random().toString(36).slice(2, 8)}`;
    const cloudPath = `baby-avatars/${openid}_${Date.now()}.jpg`;
    console.log('[avatar] uploading', { cloudPath, filePath: uploadPath });
    const res = await wx.cloud.uploadFile({ cloudPath, filePath: uploadPath });
    console.log('[avatar] uploaded fileID', res.fileID);
    wx.hideLoading();
    return res.fileID;
  } catch (e) {
    wx.hideLoading();
    console.error('[avatar] uploadFile 失败', e);
    const msg = (e && (e.errMsg || e.message)) || String(e);
    wx.showToast({ title: '上传失败:' + msg.slice(0, 14), icon: 'none', duration: 4000 });
    return null;
  }
}

module.exports = { chooseAndUploadAvatar };
