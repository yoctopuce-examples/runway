class Runnway
{


    constructor(yoctoHubUrl)
    {
        this.runway_lenght = 120;
        this.runway_thickness = 30;
        this.lpanel_ofs = 2;
        this.number = 0;
        this.is_on = false;
        this.white_color = 0x30;
        this.low_white_color = 0x10;
        this.back_color = 0xFFFF30;
        this.front_color = 0x55FF30;
        this.yocto_hub_url = yoctoHubUrl;
        this.cl_left = null;
        this.cl_right = null;
        this.cl_middle = null;
        this.cl_panel = null;
        this.fade_lenth = 1000;
    }


    async checkConfig()
    {
        await YAPI.LogUnhandledPromiseRejections();
        await YAPI.DisableExceptions();

        // Setup the API to use the VirtualHub on local machine
        let errmsg = new YErrorMsg();
        if (await YAPI.RegisterHub(this.yocto_hub_url, errmsg) !== YAPI.SUCCESS) {
            return ('Cannot contact YoctoHub: ' + errmsg.msg);
        }

        let module = YModule.FirstModule();
        while (module) {
            await module.set_luminosity(0);
            module = module.nextModule();
        }

        this.cl_left = YColorLedCluster.FindColorLedCluster("left");
        this.cl_right = YColorLedCluster.FindColorLedCluster("right");
        this.cl_middle = YColorLedCluster.FindColorLedCluster("middle");
        this.cl_panel = YColorLedCluster.FindColorLedCluster("panel");

        if (!await  this.cl_left.isOnline()) {
            return "No ColorLedCluster named 'left' found";
        }
        if (!await  this.cl_right.isOnline()) {
            return "No ColorLedCluster named 'right' found";
        }
        if (!await  this.cl_middle.isOnline()) {
            return "No ColorLedCluster named 'middle' found";
        }
        if (!await  this.cl_panel.isOnline()) {
            return "No ColorLedCluster named 'panel' found";
        }
        await this.cl_left.set_activeLedCount(150);
        await this.cl_right.set_activeLedCount(150);
        await this.cl_middle.set_activeLedCount(150);
        await this.cl_panel.set_activeLedCount(2 * 64 + 2);
        await this.status_leds(0x0, 0x00);
        //await this.setLightOff();
        return "";
    }


    async setLightOn()
    {
        await this.status_leds(0xff0000, 0xff00);
        await this.left_leds(this.white_color);
        await this.right_leds(this.white_color);
        await this.middle_leds(this.white_color);
        await this.back_leds(this.back_color);
        await this.front_leds(this.front_color);
        await this.tail_leds(true);
        await this.displayDigits(this.number, this.white_color);
        this.is_on = true;
    }

    async setLightOff()
    {
        await this.left_leds(0);
        await this.right_leds(0);
        await this.middle_leds(0);
        await this.back_leds(0);
        await this.front_leds(0);
        await this.tail_leds(false);
        await this.clearDigits();
        this.is_on = false;
        await this.status_leds(0x0, 0x00);
        //await this.status_leds(0xff0000, 0xff0000);
    }

    async clearDigits()
    {
        await this.cl_panel.hsl_move(this.lpanel_ofs, 128, 0, this.fade_lenth);
    }

    async set_number(int_value)
    {
        this.number = int_value;
        if (this.is_on) {
            await this.displayDigits(this.number, this.white_color);
        }
    }

    async left_leds(color)
    {
        await this.cl_left.hsl_move(0, this.runway_lenght, color, this.fade_lenth);
    }

    async back_leds(color)
    {
        await this.cl_left.hsl_move(this.runway_lenght, this.runway_thickness, color, this.fade_lenth);
    }

    async right_leds(color)
    {
        await this.cl_right.hsl_move(this.runway_thickness, this.runway_lenght, color, this.fade_lenth);
    }

    async front_leds(color)
    {
        await this.cl_right.hsl_move(0, this.runway_thickness, color, this.fade_lenth);
    }

    async middle_leds(color)
    {
        for (let i = 0; i < this.runway_thickness; i += 2) {
            await this.cl_middle.hsl_move(i, 1, color, this.fade_lenth);
        }
    }

    async tail_leds(isOn)
    {
        await this.cl_middle.resetBlinkSeq(0);
        if (isOn) {
            await this.cl_middle.addHslMoveToBlinkSeq(0, this.white_color, 0);
            await this.cl_middle.addHslMoveToBlinkSeq(0, 0x00000, 100);
            await this.cl_middle.addHslMoveToBlinkSeq(0, 0x000000, 900);
            //await this.cl_middle.linkLedToPeriodicBlinkSeq(this.runway_thickness,this.runway_lenght,0,1);
            let time_ofs = 1000 / this.runway_lenght;
            let static_led = [];
            for (let i = 0; i < this.runway_lenght; i++) {
                if (i % 2) {
                    static_led[i] = 0;
                    await this.cl_middle.linkLedToBlinkSeq(this.runway_thickness + i, 1, 0, i * time_ofs);
                } else {
                    static_led[i] = this.low_white_color;
                }
            }
            await this.cl_middle.hslArrayOfs_move(this.runway_thickness, static_led, this.fade_lenth);
            await this.cl_middle.startBlinkSeq(0);

        } else {
            await this.cl_middle.hsl_move(this.runway_thickness, this.runway_lenght, 0, this.fade_lenth);
        }

    }

    async status_leds(color1, color2)
    {
        await this.cl_panel.set_rgbColor(0, 1, color1);
        await this.cl_panel.set_rgbColor(1, 1, color2);
    }


    async displayDigits(value, dispColor)
    {
        let digits = [
            '.XXXXX..',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            '.XXXXX..',


            '....x...',
            '...xx...',
            '..x.x...',
            '....x...',
            '....x...',
            '....x...',
            '....x...',
            '..xxxxx.',


            '.xXXXX..',
            'x.....x.',
            'x.....x.',
            '.....x..',
            '...x....',
            '.x......',
            'x.....x.',
            'xXXXXXX.',


            '.XXXXX..',
            'x.....X.',
            ' .....X.',
            '....XX..',
            '......X.',
            ' .....X.',
            'X.....X.',
            '.XXXXX..',


            '...X....',
            '..X.....',
            '.X......',
            'X....X..',
            'X....X..',
            'XXXXXXX.',
            '.....X..',
            '.....X..',


            'XXXXXXX.',
            'X.......',
            'X.......',
            'XXXXXX..',
            '......X.',
            '......X.',
            'X.....X.',
            '.XXXXX..',


            '...XXXX.',
            '..X.....',
            '.X......',
            '.XXXXX..',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            '.XXXXX..',


            'XXXXXXX.',
            '......X.',
            '.....X..',
            '....X...',
            '...X....',
            '..X.....',
            '..X.....',
            '..X.....',


            '..XXX...',
            '.X...X..',
            '.X...X..',
            '.XXXXX..',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            '.XXXXX..',


            '.XXXXX..',
            'X.....X.',
            'X.....X.',
            'X.....X.',
            '.XXXXX..',
            '.....X..',
            '....X...',
            '.XXX....'];

        if (value > 99) {
            value = 99;
        }
        let bitmap = [];

        for (let i = 0; i < 128; i++) {
            bitmap[i] = 0;
        }
        let d = value % 10;

        for (let j = 0; j < 8; j++) {
            let s = digits[d * 8 + j];
            for (let i = 0; i < 8; i++) {
                if (s.charAt(i) !== '.') {
                    bitmap[64 + i * 8 + (7 - j)] = dispColor;
                }
            }
        }
        d = (value - d) / 10;
        for (let j = 0; j < 8; j++) {
            let s = digits[d * 8 + j];
            for (let i = 0; i < 8; i++) {
                if (s.charAt(i) !== '.') {
                    bitmap[i * 8 + (7 - j)] = dispColor
                }
            }
        }
        await this.clearDigits();
        await this.cl_panel.hslArrayOfs_move(this.lpanel_ofs, bitmap, this.fade_lenth);
    }


}
