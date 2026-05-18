import { Controller, Get } from '@nestjs/common';
import { VenueService } from './venue.service';

/**
 * M05 — Venue & Resource Manager
 */
@Controller('venue')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  findAll() {
    return this.venueService.findAll();
  }
}
