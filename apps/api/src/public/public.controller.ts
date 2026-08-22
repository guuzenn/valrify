import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { PublicService } from "./public.service";

@Controller()
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get("search")
  search(@Query("q") query = "") {
    return this.service.search(query);
  }

  @Get("entities/:slug")
  async entity(@Param("slug") slug: string) {
    const result = await this.service.entity(slug);
    if (!result) throw new NotFoundException("Profil tidak ditemukan.");
    return result;
  }

  @Get("community/users/:username")
  async communityUser(@Param("username") username: string) {
    const result = await this.service.communityUser(username);
    if (!result) throw new NotFoundException("Profil komunitas tidak ditemukan.");
    return result;
  }

  @Get("community/search")
  communitySearch(@Query("q") query = "") {
    return this.service.communitySearch(query);
  }

  @Get("community/posts")
  communityPosts(@Query("sort") sort = "latest") {
    return this.service.communityPosts(sort === "popular" ? "popular" : "latest");
  }

  @Get("community/posts/:id")
  async communityPost(@Param("id", ParseIntPipe) id: number) {
    const result = await this.service.communityPost(id);
    if (!result) throw new NotFoundException("Post Community tidak ditemukan.");
    return result;
  }

  @Get("community/posts/:id/comments")
  communityComments(@Param("id", ParseIntPipe) id: number) {
    return this.service.communityComments(id);
  }

  @Get("reports/recent")
  recentReports() {
    return this.service.recentReports();
  }

  @Get("reports/public/:publicId/evidence/:evidenceId")
  async evidence(
    @Param("publicId") publicId: string,
    @Param("evidenceId") evidenceId: string,
    @Res() response: Response,
  ) {
    const result = await this.service.publicEvidence(
      publicId,
      Number(evidenceId),
    );
    if (!result) throw new NotFoundException("Bukti publik tidak ditemukan.");
    response.setHeader("content-type", result.meta.mimeType);
    response.setHeader(
      "content-disposition",
      `inline; filename="${result.meta.fileName.replace(/["\r\n]/g, "_")}"`,
    );
    response.setHeader("cache-control", "public, max-age=3600");
    response.setHeader("x-content-type-options", "nosniff");
    response.send(result.bytes);
  }

  @Get("reports/public/:publicId")
  async report(@Param("publicId") publicId: string) {
    const result = await this.service.publicCase(publicId);
    if (!result) throw new NotFoundException("Laporan tidak ditemukan.");
    return result;
  }
}
