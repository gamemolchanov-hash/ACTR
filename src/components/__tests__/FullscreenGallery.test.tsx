/**
 * FullscreenGallery — полноэкранный просмотрщик фото товара: счётчик,
 * стрелки/клавиатура, свайп и двойной тап через Pointer Events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FullscreenGallery } from '../FullscreenGallery';
import { imgOriginal } from '@/lib/image-url';

const images = [
  { id: 1, file_path: 'a.jpg' },
  { id: 2, file_path: 'b.jpg' },
  { id: 3, file_path: 'c.jpg' },
];

function setup(index = 0) {
  const onClose = vi.fn();
  const onIndexChange = vi.fn();
  render(
    <FullscreenGallery
      open
      images={images}
      index={index}
      alt="Товар"
      onClose={onClose}
      onIndexChange={onIndexChange}
    />,
  );
  const viewport = screen.getByRole('dialog', { name: 'Товар' });
  // jsdom не считает layout — задаём вьюпорт 400×800 руками
  Object.defineProperty(viewport, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(viewport, 'clientHeight', { value: 800, configurable: true });
  viewport.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800, x: 0, y: 0 }) as DOMRect;
  return { viewport, onClose, onIndexChange };
}

const swipe = (el: HTMLElement, fromX: number, toX: number) => {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: fromX, clientY: 400 });
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(el, {
      pointerId: 1,
      clientX: fromX + ((toX - fromX) * i) / steps,
      clientY: 400,
    });
  }
  fireEvent.pointerUp(el, { pointerId: 1, clientX: toX, clientY: 400 });
};

const tap = (el: HTMLElement, x: number, y: number) => {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: x, clientY: y });
};

// Modal рендерится порталом в body — без cleanup соседние тесты видят чужие кнопки
afterEach(cleanup);

beforeEach(() => {
  // setPointerCapture нет в jsdom — компонент зовёт его опционально
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
});

describe('FullscreenGallery', () => {
  it('показывает счётчик и полноразмерное фото текущего слайда', () => {
    setup(1);
    expect(screen.getByText('2 / 3')).toBeTruthy();
    const img = screen.getByAltText('Товар — 2') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(imgOriginal('b.jpg'));
  });

  it('стрелки и клавиатура листают, на краях стрелка неактивна', () => {
    const { viewport, onIndexChange } = setup(0);
    expect((screen.getByLabelText('Previous photo') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Next photo'));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(viewport, { key: 'ArrowLeft' }); // index 0 → никуда
    expect(onIndexChange).toHaveBeenCalledTimes(2);
  });

  it('свайп влево — следующее фото, вправо — предыдущее', () => {
    const { viewport, onIndexChange } = setup(1);
    swipe(viewport, 300, 100);
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    swipe(viewport, 100, 300);
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it('двойной тап приближает, повторный — возвращает; одиночный тап ничего не делает', () => {
    const { viewport, onClose } = setup(0);
    const img = screen.getByAltText('Товар — 1') as HTMLImageElement;
    tap(viewport, 200, 400);
    expect(img.style.transform).toContain('scale(1)');
    tap(viewport, 200, 400);
    expect(img.style.transform).toContain('scale(2.5)');
    expect(onClose).not.toHaveBeenCalled();
    tap(viewport, 200, 400);
    tap(viewport, 200, 400);
    expect(img.style.transform).toContain('scale(1)');
  });

  it('крестик закрывает', () => {
    const { onClose } = setup(0);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('без картинок ничего не рендерит', () => {
    const { container } = render(
      <FullscreenGallery
        open
        images={[]}
        index={0}
        alt="Товар"
        onClose={() => {}}
        onIndexChange={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
