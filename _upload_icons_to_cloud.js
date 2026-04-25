/**
 * 将 emoji-icons 目录下所有 PNG 上传到微信云存储
 *
 * 使用方式：在微信开发者工具的控制台中运行
 * 或复制 uploadAll() 函数体到控制台执行
 *
 * 上传后会输出 fileID 映射，用于替换 FOOD_ICON_URL
 */

// 在微信开发者工具「控制台」中粘贴以下代码执行：

async function uploadAllIcons() {
  const fs = wx.getFileSystemManager();
  const basePath = `${wx.env.USER_DATA_PATH}`;

  // 读取本地 emoji-icons 目录
  const iconDir = '/static/food-images/emoji-icons';
  const files = [
    'food_egg_duck_egg.png', 'food_egg_egg_yolk.png',
    'food_fruit_cantaloupe.png', 'food_fruit_jujube.png', 'food_fruit_loquat.png',
    'food_fruit_lychee.png', 'food_fruit_mulberry.png', 'food_fruit_persimmon.png',
    'food_fruit_pineapple.png', 'food_fruit_plum.png', 'food_fruit_pomegranate.png',
    'food_grain_bread.png', 'food_grain_coix.png',
    'food_grain_corn_porridge.png', 'food_grain_millet_porridge.png',
    'food_grain_noodles.png', 'food_grain_oat_cereal.png',
    'food_grain_purple_sweet_potato.png', 'food_grain_rice_cereal.png',
    'food_grain_rice_porridge.png', 'food_grain_steamed_bun.png',
    'food_grain_wheat_cereal.png',
    'food_legume_black_bean.png', 'food_legume_chickpea.png', 'food_legume_lentil.png',
    'food_legume_mung_bean.png', 'food_legume_soy_milk.png', 'food_legume_soybean.png',
    'food_legume_tofu.png',
    'food_meat_beef_liver.png', 'food_meat_chicken_liver.png',
    'food_meat_pig_blood.png', 'food_meat_pig_liver.png',
    'food_nut_almond_paste.png', 'food_nut_flaxseed.png', 'food_nut_sesame_paste.png',
    'food_nut_tahini.png', 'food_nut_walnut_paste.png',
    'food_oil_walnut_oil.png',
    'food_sea_hairtail.png', 'food_sea_sea_bass.png', 'food_sea_yellow_croaker.png',
    'food_veg_amaranth.png', 'food_veg_asparagus.png', 'food_veg_beetroot.png',
    'food_veg_black_fungus.png', 'food_veg_cabbage.png', 'food_veg_celery.png',
    'food_veg_lotus_root.png', 'food_veg_luffa.png', 'food_veg_okra.png',
    'food_veg_rapeseed_greens.png', 'food_veg_shiitake.png', 'food_veg_taro.png',
    'food_veg_water_chestnut.png', 'food_veg_winter_melon.png', 'food_veg_zucchini.png',
  ];

  const results = {};
  const failed = [];

  for (const file of files) {
    const foodId = file.replace('.png', '');
    const localPath = `${iconDir}/${file}`;
    const cloudPath = `food-icons/${file}`;

    try {
      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: localPath,
      });
      results[foodId] = res.fileID;
      console.log(`✓ ${foodId} → ${res.fileID}`);
    } catch (e) {
      failed.push(foodId);
      console.error(`✗ ${foodId}: ${e.message || e.errMsg}`);
    }
  }

  console.log('\n===== 完成 =====');
  console.log(`成功: ${Object.keys(results).length}  失败: ${failed.length}`);

  console.log('\n// 复制以下内容替换 food-library.js 中的 FOOD_ICON_URL:');
  console.log('const FOOD_ICON_URL = {');
  for (const [id, fileID] of Object.entries(results)) {
    console.log(`  '${id}': '${fileID}',`);
  }
  console.log('};');

  return { results, failed };
}

// 执行
uploadAllIcons();
