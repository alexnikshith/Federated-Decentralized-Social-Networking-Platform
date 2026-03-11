package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/safety/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ModerationRepository struct {
	guidelineCollection *mongo.Collection
	logCollection       *mongo.Collection
}

func NewModerationRepository() *ModerationRepository {
	return &ModerationRepository{
		guidelineCollection: database.GetCollection("community_guidelines"),
		logCollection:       database.GetCollection("moderation_logs"),
	}
}

// Guideline CRUD

func (r *ModerationRepository) CreateGuideline(ctx context.Context, g *models.CommunityGuideline) error {
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()
	result, err := r.guidelineCollection.InsertOne(ctx, g)
	if err != nil {
		return err
	}
	g.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ModerationRepository) GetActiveGuidelines(ctx context.Context) ([]models.CommunityGuideline, error) {
	cursor, err := r.guidelineCollection.Find(ctx, bson.M{"is_active": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var guidelines []models.CommunityGuideline
	if err = cursor.All(ctx, &guidelines); err != nil {
		return nil, err
	}
	return guidelines, nil
}

func (r *ModerationRepository) UpdateGuideline(ctx context.Context, g *models.CommunityGuideline) error {
	g.UpdatedAt = time.Now()
	_, err := r.guidelineCollection.UpdateOne(ctx, bson.M{"_id": g.ID}, bson.M{"$set": g})
	return err
}

func (r *ModerationRepository) DeleteGuideline(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.guidelineCollection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// Moderation Log CRUD

func (r *ModerationRepository) CreateLog(ctx context.Context, l *models.ModerationLog) error {
	l.CreatedAt = time.Now()
	result, err := r.logCollection.InsertOne(ctx, l)
	if err != nil {
		return err
	}
	l.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ModerationRepository) GetLogsByTarget(ctx context.Context, targetID primitive.ObjectID) ([]models.ModerationLog, error) {
	cursor, err := r.logCollection.Find(ctx, bson.M{"target_id": targetID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.ModerationLog
	if err = cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *ModerationRepository) GetLogsByUserID(ctx context.Context, userID primitive.ObjectID) ([]models.ModerationLog, error) {
	cursor, err := r.logCollection.Find(ctx, bson.M{"user_id": userID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.ModerationLog
	if err = cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}
func (r *ModerationRepository) GetAllLogs(ctx context.Context, limit int64) ([]models.ModerationLog, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(limit)
	cursor, err := r.logCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.ModerationLog
	if err = cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *ModerationRepository) UpdateLogMetadata(ctx context.Context, logID primitive.ObjectID, username, displayName string) error {
	_, err := r.logCollection.UpdateOne(
		ctx,
		bson.M{"_id": logID},
		bson.M{"$set": bson.M{
			"username":     username,
			"display_name": displayName,
		}},
	)
	return err
}

func (r *ModerationRepository) CreateIndexes(ctx context.Context) error {
	// Guidelines indexes
	gIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{bson.E{Key: "is_active", Value: 1}},
		},
	}
	if _, err := r.guidelineCollection.Indexes().CreateMany(ctx, gIndexes); err != nil {
		return err
	}

	// Logs indexes
	lIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{bson.E{Key: "target_id", Value: 1}},
		},
		{
			Keys: bson.D{bson.E{Key: "target_type", Value: 1}},
		},
		{
			Keys: bson.D{bson.E{Key: "created_at", Value: -1}},
		},
	}
	_, err := r.logCollection.Indexes().CreateMany(ctx, lIndexes)
	return err
}
func (r *ModerationRepository) SeedInitialGuidelines(ctx context.Context) error {
	count, err := r.guidelineCollection.CountDocuments(ctx, bson.M{})
	if err != nil || count > 0 {
		return err
	}

	guidelines := []interface{}{
		models.CommunityGuideline{
			ID:          primitive.NewObjectID(),
			Title:       "No Hate Speech",
			Description: "Content that promotes violence, incites hatred, promotes discrimination, or disparages on the basis of race or ethnic origin, religion, disability, age, nationality, veteran status, sexual orientation, gender or gender identity.",
			Severity:    10,
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
		models.CommunityGuideline{
			ID:          primitive.NewObjectID(),
			Title:       "No Harassment",
			Description: "Content that is intended to harass, threaten, or bully others. This includes targeted insults, stalking, and revealing private information.",
			Severity:    9,
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
		models.CommunityGuideline{
			ID:          primitive.NewObjectID(),
			Title:       "No Sexual Content",
			Description: "Explicit sexual content, pornographic material, and non-consensual sexual content are strictly prohibited.",
			Severity:    10,
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
		models.CommunityGuideline{
			ID:          primitive.NewObjectID(),
			Title:       "No Spam",
			Description: "Repetitive content, misleading links, and promotional material that disrupts the community experience.",
			Severity:    5,
			IsActive:    true,
			CreatedAt:   time.Now(),
		},
	}

	_, err = r.guidelineCollection.InsertMany(ctx, guidelines)
	return err
}
