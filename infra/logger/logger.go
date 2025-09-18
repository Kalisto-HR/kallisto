package logger

import (
	"context"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func Init() {
	encConfig := zap.NewDevelopmentEncoderConfig()
	encConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder

	core := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encConfig),
		zapcore.AddSync(os.Stdout),
		zap.InfoLevel,
	)

	log := zap.New(core, zap.AddCaller())

	zap.ReplaceGlobals(log)
	log.Info("Successfully initialized Global Logger")
}

func LoggerFromContext(ctx context.Context) *zap.Logger {
	log := zap.L()
	if requestId, ok := ctx.Value("RequestID").(string); ok {
		log = log.With(zap.String("RequestID", requestId))
	}

	return log
}
