<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import IconButton from "../../components/IconButton.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import MerchantProductEditor from "../../components/MerchantProductEditor.vue";
import MerchantProductRow from "../../components/MerchantProductRow.vue";
import { api, getErrorMessage } from "../../services/api";
import { nativeDetail, nativeValue } from "../../utils/events";
import type { Category, Product, Shop } from "../../types";

interface ProductDraft { name: string; priceYuan: string; stock: string; categoryId: string; description: string; image: string; isAvailable: boolean }
const shop = ref<Shop | null>(null);
const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const formOpen = ref(false);
const editingProduct = ref<Product | null>(null);
const active = ref("ALL");
const selectedCategory = ref("");
const busyProductId = ref("");
const categoryOpen = ref(false);
const categoryName = ref("");
const categorySaving = ref(false);
const products = computed(() => shop.value?.products ?? []);
const categoryNames = computed(() => new Map(categories.value.map((category) => [category.id, category.name])));
const filteredProducts = computed(() => products.value.filter((product) => {
  const stateMatch = active.value === "ALL" || (active.value === "AVAILABLE" ? product.isAvailable : !product.isAvailable);
  return stateMatch && (!selectedCategory.value || product.categoryId === selectedCategory.value);
}));

async function load() {
  if (!api.isRole("MERCHANT")) { error.value = "请使用商户账号登录后管理商品"; return; }
  loading.value = true;
  error.value = "";
  try {
    const [shopResult, categoryResult] = await Promise.all([api.merchantShop(), api.categories()]);
    shop.value = shopResult;
    categories.value = categoryResult;
  } catch (reason: unknown) { error.value = getErrorMessage(reason, "商品信息加载失败"); }
  finally { loading.value = false; }
}

function addProduct() { editingProduct.value = null; formOpen.value = true; }
function editProduct(product: Product) { editingProduct.value = product; formOpen.value = true; }
function changeTab(event: unknown) { active.value = nativeDetail<{ name: string }>(event).name; }

function replaceProduct(product: Product) {
  if (!shop.value) return;
  const index = shop.value.products.findIndex((item) => item.id === product.id);
  if (index < 0) shop.value.products.unshift(product);
  else shop.value.products.splice(index, 1, product);
}

async function saveProduct(draft: ProductDraft) {
  if (saving.value) return;
  const name = draft.name.trim();
  const price = Number(draft.priceYuan);
  const stock = Number(draft.stock);
  if (!name || !draft.priceYuan.trim() || !draft.stock.trim() || !Number.isFinite(price) || price < 0 || price > 1_000_000 || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
    uni.showToast({ title: "请检查商品名称、价格和库存", icon: "none" }); return;
  }
  if (!draft.categoryId) { uni.showToast({ title: "请选择商品分类", icon: "none" }); return; }
  const image = draft.image.trim();
  if (image && !/^https?:\/\//i.test(image)) { uni.showToast({ title: "请填写有效的图片地址", icon: "none" }); return; }
  saving.value = true;
  try {
    const updated = await api.product({ name, price: Math.round(price * 100), stock, categoryId: draft.categoryId, description: draft.description.trim(), image: image || null, isAvailable: draft.isAvailable }, editingProduct.value?.id);
    replaceProduct(updated);
    formOpen.value = false;
    uni.showToast({ title: editingProduct.value ? "商品已更新" : "商品已新增" });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "保存商品失败"), icon: "none" }); }
  finally { saving.value = false; }
}

async function updateProduct(product: Product, patch: Partial<Product>) {
  if (busyProductId.value) return;
  busyProductId.value = product.id;
  try { replaceProduct(await api.product(patch, product.id)); }
  catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "商品更新失败"), icon: "none" }); }
  finally { busyProductId.value = ""; }
}

function changeStock(product: Product, delta: number) {
  const nextStock = product.stock + delta;
  if (nextStock < 0 || nextStock > 1_000_000) return;
  void updateProduct(product, { stock: nextStock });
}

function openCategory() { categoryName.value = ""; categoryOpen.value = true; }
async function saveCategory() {
  const name = categoryName.value.trim();
  if (!name || categorySaving.value) return;
  categorySaving.value = true;
  try {
    const category = await api.addCategory(name);
    categories.value = [...categories.value, category].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    categoryOpen.value = false;
    uni.showToast({ title: "分类已添加" });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "新增分类失败"), icon: "none" }); }
  finally { categorySaving.value = false; }
}
onShow(load);
</script>

<template>
  <view class="page">
    <view class="heading"><view class="heading-main"><text class="eyebrow">{{ shop?.name || '商户中心' }}</text><text class="title">商品管理</text></view><IconButton name="add" label="新增商品" variant="primary" :disabled="loading || Boolean(error)" @click="addProduct" /></view>
    <van-tabs :active="active" color="#c4532b" title-active-color="#2d2824" title-inactive-color="#81766e" :border="false" @change="changeTab"><van-tab name="ALL" title="全部" /><van-tab name="AVAILABLE" title="在售" /><van-tab name="UNAVAILABLE" title="下架" /></van-tabs>
    <view class="content">
      <StateView :loading="loading" />
      <StateView v-if="!loading && error" :error="error" action-text="重新加载" @action="load" />
      <template v-if="!loading && !error">
        <view class="category-toolbar"><scroll-view scroll-x class="category-scroll"><view class="categories"><text :class="['category', { selected: !selectedCategory }]" @click="selectedCategory = ''">全部分类</text><text v-for="category in categories" :key="category.id" :class="['category', { selected: selectedCategory === category.id }]" @click="selectedCategory = category.id">{{ category.name }}</text></view></scroll-view><IconButton name="add" label="新增分类" @click="openCategory" /></view>
        <view class="product-count">{{ filteredProducts.length }} 件商品</view>
        <StateView :empty="filteredProducts.length === 0" empty-text="暂无商品" />
        <MerchantProductRow v-for="product in filteredProducts" :key="product.id" :product="product" :category="categoryNames.get(product.categoryId)" :busy="busyProductId === product.id" @edit="editProduct(product)" @stock="changeStock(product, $event)" @available="updateProduct(product, { isAvailable: $event })" />
      </template>
    </view>
  </view>
  <MerchantNav active="products" />
  <MerchantProductEditor :show="formOpen" :product="editingProduct" :categories="categories" :saving="saving" @close="formOpen = false" @save="saveProduct" @add-category="openCategory" />
  <van-popup :show="categoryOpen" position="bottom" round :z-index="120" :close-on-click-overlay="!categorySaving" custom-style="background:#fffaf4;" @close="!categorySaving && (categoryOpen = false)"><view class="category-sheet"><view class="category-heading"><IconButton name="close" label="关闭分类编辑" :disabled="categorySaving" @click="categoryOpen = false" /><text class="category-title">新增分类</text><IconButton name="save" label="保存分类" variant="primary" :loading="categorySaving" :disabled="!categoryName.trim()" @click="saveCategory" /></view><van-field :value="categoryName" placeholder="分类名称" :maxlength="30" :disabled="categorySaving" :border="false" custom-style="padding:20px 16px;" @change="categoryName = nativeValue($event)" /></view></van-popup>
</template>

<style scoped>
.page { padding: 28rpx 0 24rpx; }.heading { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 0 30rpx 26rpx; }.heading-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8rpx; }.eyebrow { color: #a43e1d; font-size: 10px; font-weight: 650; letter-spacing: 1px; overflow-wrap: anywhere; }.title { font-size: 22px; font-weight: 800; }.content { padding: 20rpx 30rpx; }
.category-toolbar { display: flex; align-items: center; gap: 12rpx; margin: 4rpx 0 12rpx; }.category-scroll { min-width: 0; flex: 1; white-space: nowrap; }.categories { display: inline-flex; align-items: center; gap: 22rpx; }.category { flex: none; color: #81766e; font-size: 11px; line-height: 40px; }.category.selected { color: #a43e1d; font-weight: 700; }.product-count { padding: 5rpx 0 12rpx; color: #81766e; font-size: 10px; }
.category-sheet { padding: 24rpx 30rpx 40rpx; }.category-heading { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-bottom: 20rpx; }.category-title { font-size: 16px; font-weight: 750; }
</style>
