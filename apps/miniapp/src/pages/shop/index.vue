<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../lib/api";
const shop = ref<any>({ categories: [], products: [] }),
  cat = ref(""),
  cart = ref<any[]>([]),
  id = ref("");
const errorMessage = (error: unknown) => error instanceof Error && error.message ? error.message : "加载失败，请稍后重试";
const products = computed(
    () =>
      shop.value.products?.filter(
        (p: any) => !cat.value || p.categoryId === cat.value,
      ) || [],
  ),
  total = computed(() =>
    cart.value.reduce((n: any, x: any) => n + x.price * x.quantity, 0),
  );
async function load() {
  try {
    shop.value = await api.request("/shops/" + id.value);
    cat.value = shop.value.categories?.[0]?.id || "";
  } catch (error: unknown) {
    uni.showToast({ title: errorMessage(error), icon: "none" });
  }
}
function add(p: any) {
  const x = cart.value.find((x) => x.productId === p.id);
  if (x) x.quantity++;
  else
    cart.value.push({
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: 1,
    });
  uni.setStorageSync(`cart:${id.value}`, cart.value);
}
function goCart() {
  if (!cart.value.length)
    return uni.showToast({ title: "请先选择菜品", icon: "none" });
  uni.navigateTo({ url: `/pages/cart/index?shopId=${id.value}` });
}
onLoad((q: any) => {
  id.value = q.id;
  load();
});
onShow(() => {
  cart.value = uni.getStorageSync(`cart:${id.value}`) || [];
});
</script>
<template>
  <view class="page"
    ><view class="head"
      ><view class="logo">{{ shop.name?.slice(0, 1) }}</view
      ><view
        ><view class="name">{{ shop.name }}</view
        ><view class="notice">{{ shop.notice }}</view></view
      ></view
    ><scroll-view scroll-x class="tabs"
      ><text
        v-for="c in shop.categories"
        :key="c.id"
        :class="{ active: cat === c.id }"
        @click="cat = c.id"
        >{{ c.name }}</text
      ></scroll-view
    ><view class="product" v-for="p in products" :key="p.id"
      ><view class="pic">🍱</view
      ><view class="info"
        ><view class="pname">{{ p.name }}</view
        ><view class="desc">{{ p.description || "新鲜现做，校园自取" }}</view
        ><view class="price"
          >{{ api.money(p.price) }} <text>剩余 {{ p.stock }}</text></view
        ></view
      ><button class="add" :disabled="p.stock < 1" @click="add(p)">
        ＋
      </button></view
    ><view v-if="cart.length" class="bar"
      ><view
        ><text class="count"
          >{{ cart.reduce((n, x) => n + x.quantity, 0) }} 份</text
        >
        · {{ api.money(total) }}</view
      ><button @click="goCart">去结算</button></view
    ></view
  >
</template>
<style scoped>
.page {
  padding: 30rpx 32rpx 140rpx;
}
.head {
  display: flex;
  align-items: center;
  padding: 20rpx 0 34rpx;
}
.logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  background: #ffdfc8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 800;
  color: #d95425;
  margin-right: 22rpx;
}
.name {
  font-size: 40rpx;
  font-weight: 800;
}
.notice {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.tabs {
  white-space: nowrap;
  margin: 10rpx 0 30rpx;
}
.tabs text {
  display: inline-block;
  margin-right: 36rpx;
  color: #999;
  font-size: 28rpx;
}
.tabs .active {
  color: #f36d3b;
  font-weight: 700;
  border-bottom: 6rpx solid #f36d3b;
  padding-bottom: 12rpx;
}
.product {
  display: flex;
  padding: 25rpx 0;
  border-bottom: 1rpx solid #f1e9e2;
  align-items: center;
}
.pic {
  width: 150rpx;
  height: 150rpx;
  background: #fff0e5;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 66rpx;
}
.info {
  flex: 1;
  margin-left: 24rpx;
}
.pname {
  font-size: 31rpx;
  font-weight: 700;
}
.desc {
  font-size: 22rpx;
  color: #aaa;
  margin: 13rpx 0;
}
.price {
  color: #ed5c2c;
  font-size: 30rpx;
  font-weight: 700;
}
.price text {
  font-size: 20rpx;
  color: #aaa;
  font-weight: 400;
  margin-left: 10rpx;
}
.add {
  background: #f36d3b;
  color: #fff;
  width: 62rpx;
  height: 62rpx;
  line-height: 58rpx;
  padding: 0;
  font-size: 38rpx;
}
.bar {
  position: fixed;
  bottom: 24rpx;
  left: 28rpx;
  right: 28rpx;
  background: #2d2824;
  color: #fff;
  border-radius: 60rpx;
  padding: 12rpx 14rpx 12rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 12rpx 35rpx #0003;
}
.count {
  color: #ffb08d;
}
.bar button {
  background: #f36d3b;
  color: #fff;
  padding: 0 34rpx;
  height: 70rpx;
  line-height: 70rpx;
}
</style>
