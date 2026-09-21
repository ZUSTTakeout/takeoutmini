export type Role='STUDENT'|'MERCHANT'
export interface User{ id:string; role:Role; nickname:string; shopId?:string }
export interface Category{ id:string; name:string }
export interface Product{ id:string; name:string; price:number; stock:number; categoryId:string; isAvailable:boolean; description?:string; image?:string }
export interface Shop{ id:string; name:string; notice:string; isOpen:boolean; description?:string; products:Product[]; categories:Category[] }
export interface OrderItem{ name:string; price:number; quantity:number }
export interface Order{ id:string; number:string; status:string; total:number; createdAt:string; remark?:string; shop:{id:string;name:string}; items:OrderItem[] }
