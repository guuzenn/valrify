import { Body,Controller,Get,HttpCode,Post,Req,Res,UseGuards } from "@nestjs/common";import type { Request,Response } from "express";import { loginSchema,registerSchema } from "@vlrfy/validation";import { parseSchema } from "../validation/parse-schema";import { AuthService } from "./auth.service";import { CurrentActor } from "./current-actor";import { JwtAuthGuard } from "./jwt-auth.guard";import type { AuthActor } from "./auth.types";
const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:7*24*60*60*1000});
@Controller("auth")export class AuthController{constructor(private readonly auth:AuthService){}
@Post("register")register(@Body()body:unknown){return this.auth.register(parseSchema(registerSchema,body));}
@Post("verify-email")verify(@Body()body:{token?:string}){return this.auth.verifyEmail(String(body.token??""));}
@Post("login")@HttpCode(200)async login(@Body()body:unknown,@Res({passthrough:true})response:Response){const result=await this.auth.login(parseSchema(loginSchema,body));response.cookie("vlrfy_session",result.token,cookieOptions());return{user:result.actor};}
@Post("logout")@HttpCode(200)logout(@Res({passthrough:true})response:Response){response.clearCookie("vlrfy_session",{path:"/"});return{ok:true};}
@Get("me")@UseGuards(JwtAuthGuard)me(@CurrentActor()actor:AuthActor,@Req()_request:Request){return{user:actor};}}
