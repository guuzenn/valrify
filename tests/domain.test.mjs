import assert from "node:assert/strict";
import test from "node:test";
import { canManageRoles, canModerate, canTransition, getRisk, maskIdentifier, normalizeIdentifier, searchVariants } from "../lib/domain.ts";

test("normalizes Indonesian phone formats to the same value",()=>{assert.equal(normalizeIdentifier("PHONE","0812 3456 7890"),"6281234567890");assert.equal(normalizeIdentifier("PHONE","+62 812-3456-7890"),"6281234567890")});
test("normalizes bank accounts and Facebook URLs",()=>{assert.equal(normalizeIdentifier("BANK_ACCOUNT","1234-5678 9012"),"123456789012");assert.equal(normalizeIdentifier("FACEBOOK_URL","https://www.facebook.com/Reyv/"),"facebook.com/reyv")});
test("masks sensitive identifiers but preserves public usernames",()=>{assert.equal(maskIdentifier("PHONE","081234567890"),"0812••••7890");assert.equal(maskIdentifier("BANK_ACCOUNT","123456789012","BCA"),"BCA · 1234••••9012");assert.equal(maskIdentifier("RIOT_ID","reyv#1234"),"reyv#1234")});
test("risk rules are transparent and deterministic",()=>{assert.equal(getRisk(0).level,"NONE");assert.equal(getRisk(1).level,"CAUTION");assert.equal(getRisk(3).level,"HIGH");assert.match(getRisk(3).explanation,/3 laporan/) });
test("RBAC separates moderation and role management",()=>{assert.equal(canModerate("USER"),false);assert.equal(canModerate("MODERATOR"),true);assert.equal(canModerate("ADMIN"),true);assert.equal(canManageRoles("MODERATOR"),false);assert.equal(canManageRoles("ADMIN"),true)});
test("report status transitions reject direct publish",()=>{assert.equal(canTransition("SUBMITTED","PUBLISHED"),false);assert.equal(canTransition("SUBMITTED","UNDER_REVIEW"),true);assert.equal(canTransition("VERIFIED","PUBLISHED"),true);assert.equal(canTransition("PUBLISHED","REJECTED"),false)});
test("entity matching variants include exact normalized phone",()=>{assert.ok(searchVariants("081234567890").includes("6281234567890"));assert.ok(searchVariants("Reyv#1234").includes("reyv#1234"))});
