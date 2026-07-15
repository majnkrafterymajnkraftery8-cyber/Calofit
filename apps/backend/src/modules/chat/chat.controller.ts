import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Dietolog AI bilan suhbat' })
  @ApiResponse({ status: 200, description: 'AI javobi qaytarildi' })
  async sendMessage(@Body() dto: SendMessageDto) {
    const reply = await this.chatService.getResponse(dto);
    return { reply };
  }
}
