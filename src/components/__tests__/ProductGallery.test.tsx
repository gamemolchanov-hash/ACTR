/**
 * ProductGallery — инлайн-галерея карточки товара: scroll-snap трек + точки.
 * jsdom не считает layout, поэтому размеры/позиция трека задаются руками.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProductGallery } from '../ProductGallery';

const images = [
  { id: 1, file_path: 'a.jpg' },
  { id: 2, file_path: 'b.jpg' },
  { id: 3, file_path: 'c.jpg' },
];

function setup(index = 0) {
  const onIndexChange = vi.fn();
  const onOpen = vi.fn();
  const { rerender } = render(
    <ProductGallery
      images={images}
      index={index}
      alt="Товар"
      onIndexChange={onIndexChange}
      onOpen={onOpen}
    />,
  );
  const track = screen.getByRole('region', { name: 'Product photos Товар' });
  Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true });
  const scrollTo = vi.fn();
  track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
  return { track, scrollTo, onIndexChange, onOpen, rerender };
}

afterEach(cleanup);

describe('ProductGallery', () => {
  it('рендерит все фото и по точке на каждое, активная помечена', () => {
    setup(1);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
    expect(dots.map((d) => d.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(dots[1].getAttribute('aria-label')).toBe('Photo 2');
  });

  it('точки не показываются для одного фото', () => {
    render(
      <ProductGallery
        images={[images[0]]}
        index={0}
        alt="Товар"
        onIndexChange={() => {}}
        onOpen={() => {}}
      />,
    );
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByAltText('Товар')).toBeTruthy();
  });

  it('без фото показывает артикул', () => {
    render(
      <ProductGallery
        images={[]}
        index={0}
        alt="Товар"
        emptyLabel="SKU-1"
        onIndexChange={() => {}}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText('SKU-1')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('клик по точке плавно скроллит трек к слайду, индекс приходит из onScroll', () => {
    const { track, scrollTo, onIndexChange } = setup(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Photo 3' }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 800, behavior: 'smooth' });
    expect(onIndexChange).not.toHaveBeenCalled();
    // доехали
    Object.defineProperty(track, 'scrollLeft', { value: 800, configurable: true });
    fireEvent.scroll(track);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('свайп (скролл трека) меняет индекс, без изменения — не дёргает колбэк', () => {
    const { track, onIndexChange } = setup(0);
    Object.defineProperty(track, 'scrollLeft', { value: 390, configurable: true });
    fireEvent.scroll(track);
    expect(onIndexChange).toHaveBeenCalledWith(1);
    onIndexChange.mockClear();
    Object.defineProperty(track, 'scrollLeft', { value: 10, configurable: true });
    fireEvent.scroll(track);
    expect(onIndexChange).not.toHaveBeenCalled(); // округляется к 0 = текущему
  });

  it('индекс поменяли снаружи — трек догоняет мгновенно', () => {
    const { track, scrollTo, rerender } = setup(0);
    Object.defineProperty(track, 'scrollLeft', { value: 0, configurable: true });
    rerender(
      <ProductGallery
        images={images}
        index={2}
        alt="Товар"
        onIndexChange={() => {}}
        onOpen={() => {}}
      />,
    );
    expect(scrollTo).toHaveBeenCalledWith({ left: 800, behavior: 'auto' });
  });

  it('клик по фото открывает полноэкранный просмотр', () => {
    const { onOpen } = setup(0);
    fireEvent.click(screen.getByAltText('Товар — 1'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
