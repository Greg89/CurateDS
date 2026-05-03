using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.CreateItemType;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.DeleteItemType;
using CurateDS.Application.Collections.DeleteItemMedia;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Collections.CreateSavedView;
using CurateDS.Application.Collections.DeleteSavedView;
using CurateDS.Application.Collections.ExportCollection;
using CurateDS.Application.Collections.GetCollectionReports;
using CurateDS.Application.Collections.GetCollectionSummary;
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Collections.ListCollectionActivity;
using CurateDS.Application.Collections.ListSavedViews;
using CurateDS.Application.Collections.ListItemEvents;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.ListItemTypes;
using CurateDS.Application.Collections.ListLocations;
using CurateDS.Application.Collections.ListTags;
using CurateDS.Application.Collections.SetPrimaryItemMedia;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Collections.UploadItemMedia;
using CurateDS.Infrastructure;
using CurateDS.Infrastructure.Storage;
using FluentValidation;

namespace CurateDS.Api.Configuration;

internal static class ApplicationServicesRegistration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Validators
        services.AddScoped<IValidator<CreateAttributeDefinitionCommand>, CreateAttributeDefinitionCommandValidator>();
        services.AddScoped<IValidator<CreateCollectionCommand>, CreateCollectionCommandValidator>();
        services.AddScoped<IValidator<CreateItemCommand>, CreateItemCommandValidator>();
        services.AddScoped<IValidator<CreateItemTypeCommand>, CreateItemTypeCommandValidator>();
        services.AddScoped<IValidator<CreateLocationCommand>, CreateLocationCommandValidator>();
        services.AddScoped<IValidator<CreateTagCommand>, CreateTagCommandValidator>();
        services.AddScoped<IValidator<UpdateItemCommand>, UpdateItemCommandValidator>();

        // Command/query services
        services.AddScoped<CreateAttributeDefinitionService>();
        services.AddScoped<CreateCollectionService>();
        services.AddScoped<CreateItemService>();
        services.AddScoped<CreateLocationService>();
        services.AddScoped<CreateTagService>();
        services.AddScoped<DeleteCollectionService>();
        services.AddScoped<DeleteItemService>();
        services.AddScoped<DeleteTagService>();
        services.AddScoped<DeleteLocationService>();
        services.AddScoped<DeleteAttributeDefinitionService>();
        services.AddScoped<CreateSavedViewService>();
        services.AddScoped<DeleteSavedViewService>();
        services.AddScoped<ExportCollectionService>();
        services.AddScoped<GetCollectionReportsService>();
        services.AddScoped<GetCollectionSummaryService>();
        services.AddScoped<GetItemDetailService>();
        services.AddScoped<ListCollectionActivityService>();
        services.AddScoped<ListSavedViewsService>();
        services.AddScoped<ListAttributeDefinitionsService>();
        services.AddScoped<ListCollectionsService>();
        services.AddScoped<ListItemsService>();
        services.AddScoped<ListItemEventsService>();
        services.AddScoped<ListLocationsService>();
        services.AddScoped<ListTagsService>();
        services.AddScoped<UpdateItemService>();

        // Item type services
        services.AddScoped<CreateItemTypeService>();
        services.AddScoped<ListItemTypesService>();
        services.AddScoped<DeleteItemTypeService>();

        // Media services
        services.AddScoped<UploadItemMediaService>();
        services.AddScoped<DeleteItemMediaService>();
        services.AddScoped<SetPrimaryItemMediaService>();

        return services;
    }

    public static IServiceCollection AddCurateDsMediaStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<MediaStorageOptions>(
            configuration.GetSection(MediaStorageOptions.SectionName));
        services.AddScoped<IMediaStorageService, MinioMediaStorageService>();

        return services;
    }
}
